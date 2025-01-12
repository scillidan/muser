/** @jsx h */
const { h, Component } = require("preact");
const BaseComponent = require("../../components/BaseComponent/BaseComponent");
const classnames = require("classnames");
const animate = require("@jam3/gsap-promise");

const { player } = require("../../context");

const Button = require("../../components/Button/Button");
const Spinner = require("../../components/Spinner/Spinner");
const IconButton = require("../../components/IconButton/IconButton");
const GenreGraph = require("../../components/GenreGraph/GenreGraph");
const SeekBar = require("../../components/SeekBar/SeekBar");
const TrackSelector = require("../../components/TrackSelector/TrackSelector");
const AboutInfo = require("../../components/AboutInfo/AboutInfo");
const JonLogo = require("../../components/JonLogo/JonLogo");

const formatTime = (seconds) => {
  if (seconds < 0) seconds = 0;
  if (seconds >= 60 * 10)
    return new Date(seconds * 1000).toISOString().substr(14, 5);
  return new Date(seconds * 1000).toISOString().substr(15, 4);
};

const getTrackPercentage = (currentTime, duration) => {
  if (currentTime < 0 || duration <= 0) return 0;
  return (100 * currentTime) / duration;
};

const songDataUpdateInterval = 200;
const aboutUpdateInterval = 1500;

class MuserUI extends BaseComponent {
  constructor(props) {
    super(props);
    this.state = {
      isDashboardOpen: false,
      areControlsHidden: false,
      isPlaying: false,
      isAboutOpen: true,
      aboutExampleIndex: 0,
      isLoading: true,
      nowPlaying: player.getNowPlayingData(),
      currentTime: 0,
      trackColors: player.getTrackColors(),
      currentTrackId: 0,
    };

    this.hideControlsTimer = null;
  }

  componentDidMount() {
    let timer = 0;
    // Update song data
    setInterval(() => {
      this.updateNowPlaying();
      timer += songDataUpdateInterval;
      if (timer >= aboutUpdateInterval) {
        timer = 0;
        this.setState({
          aboutExampleIndex: (this.state.aboutExampleIndex + 1) % 3,
        });
      }
    }, songDataUpdateInterval);

    window.addEventListener("keydown", (key) => this.handleKeyDown(key));
    window.addEventListener("mousemove", () => this.resetHideControlsTimer());
    window.addEventListener("touchmove", () => this.resetHideControlsTimer());

    this.setTrack(player.playlist[0].id);
  }

  handleKeyDown(key) {
    if (key.code == "Space") this.handleToggleAudio();
  }

  resetHideControlsTimer(forceReset = false) {
    const { isDashboardOpen, isPlaying } = this.state;
    this.setState({ areControlsHidden: false });
    clearTimeout(this.hideControlsTimer);

    if (!isDashboardOpen && (forceReset || isPlaying)) {
      this.hideControlsTimer = setTimeout(() => this.hideControls(), 3000);
    }
  }

  animateIn() {
    // return Promise.all([this.header.animateIn({ delay: 0.25 })]);
  }

  animateOut() {
    // return Promise.all([this.header.animateOut()]);
  }

  hideControls() {
    this.setState({ areControlsHidden: true });
  }

  updateNowPlaying() {
    const nowPlaying = player.getNowPlayingData();
    if (
      Math.floor(nowPlaying.currentTime) !=
      Math.floor(this.state.nowPlaying.currentTime)
    ) {
      this.setState({ nowPlaying });
    } else if (this.state.isPlaying) {
      this.setState({ currentTime: player.getCurrentTime() });
    }
  }

  handleToggleAudio = () => {
    if (this.state.isPlaying) player.pause();
    else {
      player.play();
      this.resetHideControlsTimer(true);
    }

    this.setState({
      isPlaying: !this.state.isPlaying,
      areControlsHidden: false,
    });
  };

  setTrack = (trackId) => {
    this.setState({
      currentTrackId: trackId,
      isPlaying: false,
      isLoading: true,
    });
    player.setTrack(trackId).then(() => {
      this.setState({
        isPlaying: false,
        isLoading: false,
        nowPlaying: player.getNowPlayingData(),
        trackColors: player.getTrackColors(),
        currentTime: 0,
      });
    });
  };

  handleSeek = (e) => {
    const percentage = e.target.value;
    player.seek(percentage);
  };

  handleToggleDashboard = () => {
    this.setState({
      isDashboardOpen: !this.state.isDashboardOpen,
    });
    this.resetHideControlsTimer();
  };

  handleToggleAbout = () => {
    this.setState({
      isAboutOpen: !this.state.isAboutOpen,
    });
  };

  render() {
    const classes = classnames({
      Muser: true,
      hidden: this.state.areControlsHidden,
    });

    const loaderClasses = classnames({
      loader: true,
      hidden: !this.state.isLoading,
    });

    const {
      nowPlaying,
      currentTime,
      isPlaying,
      isAboutOpen,
      trackColors,
      aboutExampleIndex,
    } = this.state;

    return (
      <div
        className={classes}
        ref={(c) => {
          this.container = c;
        }}
      >
        <div className="top-bar">
          <div className="help">
            <IconButton onClick={this.handleToggleAbout}>
              <i className="material-icons">info</i>
            </IconButton>
          </div>
          <TrackSelector
            value={this.state.currentTrackId}
            tracks={player.playlist}
            onChange={(trackId) => this.setTrack(trackId)}
          />
          <JonLogo />
        </div>

        <div className={loaderClasses}>
          <Spinner />
          <h3>Loading track data...</h3>
        </div>

        {isAboutOpen && (
          <AboutInfo
            onClose={this.handleToggleAbout}
            exampleIndex={aboutExampleIndex}
          />
        )}
        <div className="ui-wrapper">
          <div className="controls">
            <Button
              onClick={this.handleToggleAudio}
              ref={(c) => {
                this.button = c;
              }}
            >
              {isPlaying ? (
                <i className="material-icons">pause</i>
              ) : (
                <i className="material-icons">play_arrow</i>
              )}
            </Button>
            <div className="songInfo">
              <strong>{nowPlaying.title}</strong>
              <br />
              {nowPlaying.artist}
            </div>

            <div className="currentTime">
              {formatTime(nowPlaying.currentTime)} /{" "}
              {formatTime(nowPlaying.duration)}
            </div>
            <IconButton onClick={this.handleToggleDashboard}>
              <i className="material-icons">
                {this.state.isDashboardOpen
                  ? "insert_chart"
                  : "insert_chart_outlined"}
              </i>
            </IconButton>
          </div>

          <SeekBar
            value={getTrackPercentage(currentTime, nowPlaying.duration)}
            backgroundColors={trackColors}
            onChange={this.handleSeek}
          />
          {this.state.isDashboardOpen && (
            <GenreGraph genres={nowPlaying.topGenres} />
          )}
        </div>
      </div>
    );
  }
}

module.exports = MuserUI;
