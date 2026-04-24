import L from 'leaflet';
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const volunteerIcon = new L.DivIcon({
  html: '<div class="map-pin map-pin--volunteer"></div>',
  className: '',
  iconSize: [18, 18],
});

const busyVolunteerIcon = new L.DivIcon({
  html: '<div class="map-pin map-pin--busy"></div>',
  className: '',
  iconSize: [18, 18],
});

const taskIcon = (urgency) =>
  new L.DivIcon({
    html: `<div class="map-pin map-pin--task map-pin--${String(urgency || 'Low').toLowerCase()}"></div>`,
    className: '',
    iconSize: [20, 20],
  });

const INDIA_CENTER = [23.5937, 78.9629];

export default function ZoneMap({ volunteers, tasks }) {
  const firstVolunteer = volunteers.find((volunteer) => volunteer.location?.lat && volunteer.location?.lng);
  const firstTask = tasks.find((task) => task.location?.lat && task.location?.lng);
  const center = firstVolunteer
    ? [firstVolunteer.location.lat, firstVolunteer.location.lng]
    : firstTask
      ? [firstTask.location.lat, firstTask.location.lng]
      : INDIA_CENTER;

  const aggregate = new Map();

  volunteers.forEach((volunteer) => {
    const zone = volunteer.location?.zone || 'Unassigned';
    if (!aggregate.has(zone)) {
      aggregate.set(zone, {
        zone,
        volunteers: 0,
        lat: volunteer.location?.lat || null,
        lng: volunteer.location?.lng || null,
      });
    }

    const item = aggregate.get(zone);
    item.volunteers += 1;
    if (!item.lat && volunteer.location?.lat) item.lat = volunteer.location.lat;
    if (!item.lng && volunteer.location?.lng) item.lng = volunteer.location.lng;
  });

  const zones = Array.from(aggregate.values()).filter((zone) => zone.lat && zone.lng);

  return (
    <section className="panel map-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Geo View</p>
          <h2>Zone map and live field footprint</h2>
        </div>
      </div>

      <div className="map-wrap">
        <MapContainer center={center} zoom={5} scrollWheelZoom className="map-container">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {zones.map((zone) => (
            <Circle
              key={zone.zone}
              center={[zone.lat, zone.lng]}
              radius={Math.max(3000, zone.volunteers * 1200)}
              pathOptions={{ color: '#1f7a8c', fillColor: '#1f7a8c', fillOpacity: 0.14 }}
            >
              <Popup>
                <strong>{zone.zone}</strong>
                <div>{zone.volunteers} volunteers in this zone</div>
              </Popup>
            </Circle>
          ))}

          {volunteers
            .filter((volunteer) => volunteer.location?.lat && volunteer.location?.lng)
            .map((volunteer) => (
              <Marker
                key={volunteer.id}
                position={[volunteer.location.lat, volunteer.location.lng]}
                icon={volunteer.availability ? volunteerIcon : busyVolunteerIcon}
              >
                <Popup>
                  <strong>{volunteer.name}</strong>
                  <div>{volunteer.location.zone || 'Zone pending'}</div>
                  <div>{volunteer.availability ? 'Available' : 'Busy'}</div>
                </Popup>
              </Marker>
            ))}

          {tasks
            .filter((task) => task.location?.lat && task.location?.lng)
            .map((task) => (
              <Marker key={task.id} position={[task.location.lat, task.location.lng]} icon={taskIcon(task.urgency)}>
                <Popup>
                  <strong>{task.title}</strong>
                  <div>{task.zone}</div>
                  <div>Status: {task.status}</div>
                  <div>Assigned: {task.assignedTo?.name || 'Unassigned'}</div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </section>
  );
}
