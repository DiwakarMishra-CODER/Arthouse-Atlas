/**
 * The Movements page's own atmosphere, laid over the site's shared starfield.
 *
 * A projector beam falls from the top of the room and flickers faintly; the
 * light it throws takes the colour of whichever movement is on screen — the
 * one hovered, or the one scrolled into the middle — so reading down the
 * century slowly re-lights the page.
 */
const ProjectionRoom = ({ tint = '#d9ad62', reducedMotion = false }) => (
    <div aria-hidden="true" className="projection-room pointer-events-none fixed inset-0 z-0" style={{ '--tint': tint }}>
        {/* the room takes the movement's light */}
        <div className="absolute inset-0 [background:radial-gradient(ellipse_75%_60%_at_50%_-8%,color-mix(in_srgb,var(--tint)_28%,transparent),transparent_72%)]" />
        <div className="absolute inset-0 [background:radial-gradient(ellipse_60%_40%_at_50%_112%,color-mix(in_srgb,var(--tint)_14%,transparent),transparent_70%)]" />

        {/* the beam — blurred on the wrapper so the cone's edges soften instead of clipping hard */}
        <div className={`absolute left-1/2 top-0 h-[115vh] w-[130vw] max-w-[1800px] -translate-x-1/2 blur-[60px] ${reducedMotion ? 'opacity-80' : 'projector-flicker'}`}>
            <div
                className="absolute inset-0"
                style={{
                    clipPath: 'polygon(45% 0, 55% 0, 92% 100%, 8% 100%)',
                    background: 'linear-gradient(to bottom, color-mix(in srgb, var(--tint) 18%, transparent), color-mix(in srgb, var(--tint) 6%, transparent) 50%, transparent 85%)'
                }}
            />
        </div>

        {/* edges fall away to the dark of the auditorium */}
        <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />
    </div>
);

export default ProjectionRoom;
