const Anthropic = require('@anthropic-ai/sdk');

const EXPERIENCE_WEIGHT = {
  Beginner: 10,
  Intermediate: 18,
  Expert: 25,
};

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function countSkillMatches(taskSkills, volunteerSkills) {
  const required = taskSkills.map(normalizeText).filter(Boolean);
  const available = new Set(volunteerSkills.map(normalizeText).filter(Boolean));
  return required.filter((skill) => available.has(skill)).length;
}

function buildFallbackReason(task, volunteer, matchedSkills, sameZone) {
  const parts = [];

  if (matchedSkills > 0) {
    parts.push(`${matchedSkills} required skill${matchedSkills > 1 ? 's' : ''} matched`);
  }

  if (sameZone) {
    parts.push('already located in the target zone');
  }

  parts.push(`${volunteer.experience} experience`);

  if (volunteer.availability) {
    parts.push('currently available');
  }

  return `${volunteer.name} is a strong fit because ${parts.join(', ')}.`;
}

function fallbackMatchVolunteers(task, volunteers) {
  const requiredSkills = task.requiredSkills || [];

  const matches = volunteers
    .filter((volunteer) => volunteer.role === 'volunteer' && volunteer.availability)
    .map((volunteer) => {
      const matchedSkills = countSkillMatches(requiredSkills, volunteer.skills || []);
      const skillCoverage = requiredSkills.length
        ? (matchedSkills / requiredSkills.length) * 60
        : 35;
      const sameZone = normalizeText(task.zone) === normalizeText(volunteer.location?.zone);
      const zoneScore = sameZone ? (task.urgency === 'Critical' ? 28 : 18) : 0;
      const availabilityScore = volunteer.availability ? 7 : 0;
      const experienceScore = EXPERIENCE_WEIGHT[volunteer.experience] || 10;
      const reliabilityScore = Math.min(volunteer.totalTasks || 0, 10);

      return {
        volunteerId: String(volunteer._id),
        name: volunteer.name,
        score: Math.min(
          100,
          Math.round(skillCoverage + zoneScore + availabilityScore + experienceScore + reliabilityScore)
        ),
        reason: buildFallbackReason(task, volunteer, matchedSkills, sameZone),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return { matches };
}

function extractTextFromAnthropicResponse(response) {
  if (!response || !Array.isArray(response.content)) {
    return '';
  }

  return response.content
    .filter((item) => item.type === 'text')
    .map((item) => item.text)
    .join('\n')
    .trim();
}

function parseJSONResponse(text) {
  if (!text) {
    throw new Error('AI service returned an empty response.');
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw error;
    }

    return JSON.parse(match[0]);
  }
}

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

async function runAnthropicMatch(task, volunteers) {
  const client = getAnthropicClient();
  if (!client) return null;

  const prompt = `
You are an intelligent volunteer coordination assistant for an NGO disaster relief platform.

TASK DETAILS:
- Title: ${task.title}
- Description: ${task.description || 'N/A'}
- Required Skills: ${(task.requiredSkills || []).join(', ') || 'None specified'}
- Zone: ${task.zone}
- Urgency: ${task.urgency}

AVAILABLE VOLUNTEERS:
${volunteers
    .map(
      (volunteer, index) => `
${index + 1}. volunteerId: ${volunteer._id}
   Name: ${volunteer.name}
   Skills: ${(volunteer.skills || []).join(', ') || 'None'}
   Zone: ${volunteer.location?.zone || 'Unknown'}
   Experience: ${volunteer.experience}
   Tasks Completed: ${volunteer.totalTasks}
   Reputation Score: ${volunteer.reputationScore || 50}
   Available: ${volunteer.availability}
`
    )
    .join('')}

Select the top 3 best-matched volunteers for this task.
Prioritize skill match, zone proximity, experience level, reputation score, and availability.
For Critical urgency, zone proximity should matter more heavily.

Respond with valid JSON only using this shape:
{
  "matches": [
    {
      "volunteerId": "string",
      "name": "string",
      "score": 95,
      "reason": "short explanation"
    }
  ]
}`;

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const parsed = parseJSONResponse(extractTextFromAnthropicResponse(response));

  if (!Array.isArray(parsed.matches)) {
    throw new Error('AI response did not contain a matches array.');
  }

  return {
    matches: parsed.matches
      .filter((item) => item && item.volunteerId && item.name)
      .slice(0, 3)
      .map((item) => ({
        volunteerId: String(item.volunteerId),
        name: item.name,
        score: Math.max(0, Math.min(100, Number(item.score) || 0)),
        reason: item.reason || 'Recommended by AI based on task fit.',
      })),
  };
}

async function matchVolunteersToTask(task, volunteers) {
  const eligibleVolunteers = volunteers.filter(
    (volunteer) => volunteer.role === 'volunteer' && volunteer.availability
  );

  if (!eligibleVolunteers.length) {
    return { matches: [] };
  }

  try {
    const aiResult = await runAnthropicMatch(task, eligibleVolunteers);
    if (aiResult?.matches?.length) {
      return aiResult;
    }
  } catch (error) {
    console.warn('Anthropic matching failed, using fallback scorer:', error.message);
  }

  return fallbackMatchVolunteers(task, eligibleVolunteers);
}

// ─── Team Formation AI ────────────────────────────────────────────────────────

async function formTeamForTask(task, volunteers) {
  const eligible = volunteers.filter((v) => v.role === 'volunteer' && v.availability);
  if (!eligible.length) return { team: [], roles: [] };

  const client = getAnthropicClient();

  if (client) {
    try {
      const prompt = `
You are an expert disaster relief coordinator. Form the best-balanced TEAM for this task.

TASK:
- Title: ${task.title}
- Description: ${task.description || 'N/A'}
- Required Skills: ${(task.requiredSkills || []).join(', ') || 'General'}
- Zone: ${task.zone}
- Urgency: ${task.urgency}

AVAILABLE VOLUNTEERS:
${eligible.map((v, i) => `${i + 1}. ID:${v._id} | ${v.name} | Skills: ${(v.skills||[]).join(',')||'None'} | Exp: ${v.experience} | Zone: ${v.location?.zone||'?'} | Tasks: ${v.totalTasks}`).join('\n')}

Assign specific ROLES to 2–4 volunteers forming a balanced team (e.g., Team Lead, Medic, Logistics, Driver, Translator).
Each team member should have a distinct role suited to their skills.

Respond with valid JSON only:
{
  "team": [
    { "volunteerId": "string", "name": "string", "role": "Team Lead", "reason": "short reason" }
  ],
  "teamRationale": "Overall reasoning for this team composition"
}`;

      const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      const parsed = parseJSONResponse(extractTextFromAnthropicResponse(response));
      if (Array.isArray(parsed.team) && parsed.team.length) {
        return { team: parsed.team.slice(0, 4), teamRationale: parsed.teamRationale || '' };
      }
    } catch (err) {
      console.warn('Team formation AI failed, using fallback:', err.message);
    }
  }

  // Fallback: simple role assignment based on skills
  const sorted = eligible
    .map((v) => {
      const skills = (v.skills || []).map(normalizeText);
      const isMedic = skills.some((s) => ['first aid', 'medical', 'nurse', 'doctor', 'medic'].includes(s));
      const isDriver = skills.some((s) => ['driving', 'driver', 'vehicle', 'transport'].includes(s));
      const isTranslator = skills.some((s) => ['translation', 'translator', 'language'].includes(s));
      const expScore = EXPERIENCE_WEIGHT[v.experience] || 10;
      return { v, isMedic, isDriver, isTranslator, expScore };
    })
    .sort((a, b) => b.expScore - a.expScore);

  const team = [];
  let leadAdded = false;

  for (const item of sorted) {
    if (team.length >= 3) break;
    let role = 'Support';
    if (!leadAdded) { role = 'Team Lead'; leadAdded = true; }
    else if (item.isMedic) role = 'Medic';
    else if (item.isDriver) role = 'Driver';
    else if (item.isTranslator) role = 'Translator';
    team.push({ volunteerId: String(item.v._id), name: item.v.name, role, reason: `${item.v.experience} with ${(item.v.skills||[]).slice(0,2).join(', ')||'general skills'}` });
  }

  return { team, teamRationale: 'Team selected based on experience and skill complement.' };
}

// ─── AI Auto-Task Generation ──────────────────────────────────────────────────

async function generateTasksFromCrisis(description) {
  const client = getAnthropicClient();

  if (client) {
    try {
      const prompt = `
You are a disaster relief coordinator AI. Given a crisis situation description, generate 3–5 structured relief tasks.

CRISIS DESCRIPTION: ${description}

Generate structured tasks that cover the most urgent needs (rescue, medical, logistics, shelter, water, etc.).

Respond with valid JSON only:
{
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "requiredSkills": ["skill1", "skill2"],
      "urgency": "Critical|Medium|Low",
      "zone": "string (inferred from description or 'General')",
      "rationale": "why this task is needed"
    }
  ]
}`;

      const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      });

      const parsed = parseJSONResponse(extractTextFromAnthropicResponse(response));
      if (Array.isArray(parsed.tasks) && parsed.tasks.length) {
        return { tasks: parsed.tasks.slice(0, 5) };
      }
    } catch (err) {
      console.warn('Auto-task generation failed:', err.message);
    }
  }

  // Fallback: generic task templates
  return {
    tasks: [
      { title: 'Emergency Medical Assistance', description: description, requiredSkills: ['First Aid', 'Medical'], urgency: 'Critical', zone: 'General', rationale: 'Medical support needed immediately.' },
      { title: 'Search and Rescue Operations', description: description, requiredSkills: ['Rescue', 'Physical Fitness'], urgency: 'Critical', zone: 'General', rationale: 'Locate and assist survivors.' },
      { title: 'Emergency Supply Distribution', description: description, requiredSkills: ['Logistics', 'Driving'], urgency: 'Medium', zone: 'General', rationale: 'Distribute food, water, and supplies.' },
    ],
  };
}

// ─── Resource Redistribution AI ───────────────────────────────────────────────

async function suggestResourceRedistribution(resources, zones) {
  const client = getAnthropicClient();

  const summary = zones.map((z) => {
    const zoneResources = resources.filter((r) => r.zone === z.zone);
    const activeTasks = z.activeTasks || 0;
    const volunteers = z.volunteers || 0;
    return `Zone: ${z.zone} | Active Tasks: ${activeTasks} | Volunteers: ${volunteers} | Resources: ${zoneResources.map((r) => `${r.name}(${r.quantity}${r.unit})`).join(', ') || 'none'}`;
  }).join('\n');

  if (client) {
    try {
      const prompt = `
You are a disaster relief logistics expert. Analyze zone resources vs. demand and suggest redistributions.

ZONE DATA:
${summary}

Identify imbalances and suggest specific resource transfers between zones.
Focus on zones with high active tasks but low resources.

Respond with valid JSON only:
{
  "suggestions": [
    {
      "from": "Zone A",
      "to": "Zone B",
      "resource": "Food",
      "quantity": 50,
      "unit": "kg",
      "priority": "High|Medium|Low",
      "reason": "Zone B has 8 active tasks but minimal food supply"
    }
  ],
  "overallAssessment": "brief summary of resource situation"
}`;

      const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      });

      const parsed = parseJSONResponse(extractTextFromAnthropicResponse(response));
      if (parsed.suggestions) return parsed;
    } catch (err) {
      console.warn('Resource redistribution AI failed:', err.message);
    }
  }

  return {
    suggestions: [],
    overallAssessment: 'Unable to generate AI suggestions. Review zone data manually.',
  };
}

// ─── Demand Forecasting AI ────────────────────────────────────────────────────

async function forecastZoneDemand(historicalData, currentData) {
  const client = getAnthropicClient();

  if (client) {
    try {
      const prompt = `
You are a predictive analytics expert for disaster relief operations.

HISTORICAL TASK COMPLETION (last 7 days by zone):
${historicalData.map((d) => `${d.zone}: ${d.completed} completed, ${d.avgUrgency} avg urgency`).join('\n') || 'No historical data'}

CURRENT ZONE STATUS:
${currentData.map((z) => `${z.zone}: ${z.activeTasks} active tasks, ${z.volunteers} volunteers, ${z.availableVolunteers} available`).join('\n') || 'No current data'}

Predict demand/risk level for each zone for the next 24–48 hours.
Assign a risk score 0–100 and suggest pre-allocation actions.

Respond with valid JSON only:
{
  "forecast": [
    {
      "zone": "string",
      "riskScore": 85,
      "trend": "increasing|stable|decreasing",
      "predictedTasks": 12,
      "recommendedVolunteers": 5,
      "action": "pre-allocate medics and drivers",
      "reasoning": "brief explanation"
    }
  ],
  "summary": "overall situation summary"
}`;

      const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      });

      const parsed = parseJSONResponse(extractTextFromAnthropicResponse(response));
      if (parsed.forecast) return parsed;
    } catch (err) {
      console.warn('Demand forecasting AI failed, using algorithmic fallback:', err.message);
    }
  }

  // Algorithmic fallback
  const forecast = currentData.map((z) => {
    const historical = historicalData.find((h) => h.zone === z.zone);
    const taskPressure = z.activeTasks / Math.max(z.volunteers || 1, 1);
    const volunteerShortage = Math.max(0, z.activeTasks - z.availableVolunteers);
    const riskScore = Math.min(100, Math.round(taskPressure * 40 + volunteerShortage * 10 + (historical?.completed > 5 ? 15 : 0)));

    return {
      zone: z.zone,
      riskScore,
      trend: taskPressure > 1.5 ? 'increasing' : taskPressure < 0.5 ? 'decreasing' : 'stable',
      predictedTasks: Math.round(z.activeTasks * 1.2),
      recommendedVolunteers: Math.max(z.activeTasks, z.availableVolunteers),
      action: riskScore > 70 ? 'Immediate volunteer pre-allocation required' : riskScore > 40 ? 'Monitor and standby resources' : 'Normal operations',
      reasoning: `Task/volunteer ratio: ${taskPressure.toFixed(1)}, ${volunteerShortage} volunteer shortage.`,
    };
  });

  return { forecast, summary: 'Algorithmic forecast based on current zone data.' };
}

module.exports = {
  matchVolunteersToTask,
  formTeamForTask,
  generateTasksFromCrisis,
  suggestResourceRedistribution,
  forecastZoneDemand,
};
