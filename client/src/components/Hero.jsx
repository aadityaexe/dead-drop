export default function Hero() {
  const scrollDown = () => {
    window.scrollBy({ top: window.innerHeight * 0.5, behavior: 'smooth' });
  };

  return (
    <section className="hero">
      <div className="hero-badge">Zero-Knowledge Protocol</div>
      <h1 className="glitch" data-text="Unrecoverable secrets.">
        Unrecoverable secrets.
      </h1>
      <p className="hero-subtitle">
        Your message is encrypted locally. The key never leaves your device. 
        <br />
        Once read, the data is <strong className="annihilated-text">cryptographically annihilated</strong>.
      </p>
      
      <div className="hero-scroll-indicator" onClick={scrollDown}>
        <span>Create Drop</span>
        <div className="arrow-down">↓</div>
      </div>
    </section>
  );
}
