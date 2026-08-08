import React from 'react';
import { Stethoscope } from 'lucide-react';
import { StatusPill } from './StatusPill';

/**
 * Compact by default; hovering (or focusing, for keyboard users) zooms the
 * card slightly and reveals the full clinician/timing/duration/description
 * detail block. Purely CSS-driven (:hover / :focus-within in index.css) so
 * it collapses back to the compact face automatically on mouse-leave.
 */
export function PackageCard({ service }) {
  return (
    <article className="card service-card package-card" tabIndex={0}>
      <div className="card-top">
        <Stethoscope size={22} />
        <StatusPill value={service.category || 'Service'} />
      </div>
      <h3>{service.name}</h3>
      <p className="price-line">
        ${service.price} <span>/ {service.durationMinutes} min</span>
      </p>

      <div className="package-reveal">
        <p>{service.description}</p>
        <dl className="details">
          <div>
            <dt>Clinician</dt>
            <dd>{service.specialist}</dd>
          </div>
          <div>
            <dt>Timing</dt>
            <dd>{service.availability}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{service.durationMinutes} min</dd>
          </div>
          <div>
            <dt>Charge</dt>
            <dd>${service.price}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
