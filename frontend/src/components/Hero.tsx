import { Check, Sparkles } from "lucide-react";

const foundationFeatures = [
  "Responsive React interface",
  "Live API health monitoring",
  "Secure service boundary",
];

export function Hero() {
  return (
    <section className="hero">
      <div className="eyebrow">
        <Sparkles size={14} />
        Your intelligent knowledge layer
      </div>
      <h1>
        Give your knowledge
        <span>somewhere to think.</span>
      </h1>
      <p className="hero-copy">
        A focused workspace designed to turn scattered information into clear,
        useful answers. The foundation is ready and connected.
      </p>

      <div className="foundation-list" aria-label="Available foundation features">
        {foundationFeatures.map((feature) => (
          <div key={feature}>
            <Check size={15} />
            {feature}
          </div>
        ))}
      </div>
    </section>
  );
}
