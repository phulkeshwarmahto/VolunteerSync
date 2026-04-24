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

async function runAnthropicMatch(task, volunteers) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return null;
  }

  const client = new Anthropic({ apiKey });
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
   Available: ${volunteer.availability}
`
    )
    .join('')}

Select the top 3 best-matched volunteers for this task.
Prioritize skill match, zone proximity, experience level, and availability.
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

module.exports = {
  matchVolunteersToTask,
};
