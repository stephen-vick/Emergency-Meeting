interface Props {
  onNavigate: (page: 'menu' | 'browser' | 'skeld') => void;
}

const STARS_URL = encodeURI('/assets/among us/among-us-assets-main/among-us-assets-main/Background/Stars-sharedassets0.assets-56.png');
const BANNER_URL = encodeURI('/assets/among us/among-us-assets-main/among-us-assets-main/Logos/bannerLogo_AmongUs-sharedassets0.assets-137.png');
const CREW_URL = encodeURI('/assets/among us/among-us-assets-main/among-us-assets-main/Players/MainScreenCrew-sharedassets0.assets-172.png');
const INNERSLOTH_URL = encodeURI('/assets/among us/Among Us Presskit/Logos/Innersloth Logos/logo_Blue_whiteStroked.png');

function ProfiseeLogo() {
  return (
    <svg
      className="profisee-logo"
      viewBox="0 0 260 48"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Profisee"
    >
      {/* Accent bar */}
      <rect x="0" y="0" width="4" height="48" rx="2" fill="#4fc3f7" />
      {/* Wordmark */}
      <text
        x="16"
        y="36"
        fontFamily="'Segoe UI', 'Inter', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="700"
        fontSize="38"
        letterSpacing="-0.5"
        fill="#ffffff"
      >
        Prof
        <tspan fill="#4fc3f7">i</tspan>
        see
      </text>
    </svg>
  );
}

export default function MainMenu({ onNavigate }: Props) {
  return (
    <div className="main-menu">
      {/* Animated stars layers */}
      <div
        className="stars-layer stars-layer-1"
        style={{ backgroundImage: `url(${STARS_URL})` }}
      />
      <div
        className="stars-layer stars-layer-2"
        style={{ backgroundImage: `url(${STARS_URL})` }}
      />

      {/* Decorative crewmates */}
      <img
        src={CREW_URL}
        alt=""
        className="menu-crew-deco menu-crew-left"
      />
      <img
        src={CREW_URL}
        alt=""
        className="menu-crew-deco menu-crew-right"
      />

      <div className="menu-content">
        {/* Partnership header */}
        <div className="menu-partnership">
          <div className="partner-logo-wrap">
            <ProfiseeLogo />
          </div>
          <span className="partner-x">&times;</span>
          <div className="partner-logo-wrap innersloth-wrap">
            <img
              src={INNERSLOTH_URL}
              alt="InnerSloth"
              className="innersloth-logo"
            />
            <span className="innersloth-label">InnerSloth</span>
          </div>
        </div>

        {/* Among Us banner logo */}
        <img
          src={BANNER_URL}
          alt="Among Us"
          className="menu-banner"
        />

        {/* Subtitle */}
        <div className="menu-subtitle">
          Emergency Meeting &mdash; Hackathon 2026
        </div>

        {/* Selection cards */}
        <div className="menu-cards">
          <button
            className="menu-card"
            onClick={() => onNavigate('browser')}
          >
            <div className="card-icon">&#128193;</div>
            <div className="card-title">Asset Browser</div>
            <div className="card-desc">
              Browse, search, and preview all Among Us assets with metadata and copy-to-clipboard.
            </div>
          </button>

          <button
            className="menu-card menu-card-skeld"
            onClick={() => onNavigate('skeld')}
          >
            <div className="card-icon">&#128506;</div>
            <div className="card-title">Skeld Map Test</div>
            <div className="card-desc">
              Walk around The Skeld as a crewmate using WASD keys. Explore the ship rooms.
            </div>
          </button>
        </div>

        <div className="menu-footer">
          Press a card to begin
        </div>
      </div>
    </div>
  );
}
