import React from 'react';
import { Stethoscope } from 'lucide-react';

export function DoctorCard({ doctor }) {
  return (
    <article className="card doctor-card">
      <div className="card-top">
        <Stethoscope size={22} />
      </div>
      <h3>{doctor.displayName}</h3>
      {doctor.bio && <p>{doctor.bio}</p>}
      <div className="chip-row">
        {(doctor.specialties || []).map((specialty) => (
          <span className="chip" key={specialty}>
            {specialty}
          </span>
        ))}
      </div>
      {doctor.schedule && doctor.schedule.length ? (
        <dl className="details schedule-list">
          {doctor.schedule.map((slot, index) => (
            <div key={`${slot.day}-${index}`}>
              <dt>{slot.day}</dt>
              <dd>
                {slot.start}&ndash;{slot.end}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="empty">Availability shared once you request a consultation.</p>
      )}
    </article>
  );
}
