/** @jsx h */
const { h, Component } = require("preact");
const BaseComponent = require("../components/BaseComponent/BaseComponent");
const classnames = require("classnames");
const animate = require("@jam3/gsap-promise");
const PreactTransitionGroup = require("preact-transition-group");

const objectMap = (obj, fn) =>
  Object.fromEntries(Object.entries(obj).map(([k, v], i) => [k, fn(v, k, i)]));

// Audio
const createPlayer = require("web-audio-player");
const createAnalyser = require("web-audio-analyser");

const songTags = require("../music-data/dancing-with-kadafi.json");

// DOM Sections
const Landing = require("../sections/Landing/Landing");
const Muser = require("../sections/Muser/Muser");
const Preloader = require("../sections/Preloader/Preloader");

// WebGL canvas component
const WebGLCanvas = require("../components/WebGLCanvas/WebGLCanvas");

// WebGL scenes
// const Honeycomb = require("../webgl/scene/Honeycomb");
const SpectrumVisualizer = require("../webgl/scene/SpectrumVisualizer");
const MuserVisualizer = require("../webgl/scene/MuserVisualizer");

const { assets, webgl } = require("../context");

class App extends BaseComponent {
  constructor(props) {
    super(props);

    this.state = {
      isLoaded: false,
      isAltMaterial: false,
      section: "Preloader",
      isPlaying: false,
      nowPlaying: {
        title: "-",
        currentTime: 0,
        duration: 0,
        tags: {},
      },
    };
  }

  handlePreventDefault = (ev) => {
    ev.preventDefault();
  };

  componentDidUpdate(oldProps, oldState) {
    if (this.state.isLoaded && oldState.isLoaded !== this.state.isLoaded) {
      // start animation loop
      webgl.start();

      // draw a frame so that its correct on first DOM render
      webgl.draw();

      // trigger initial animation in of content
      webgl.animateIn({ delay: 0.5 });
    }

    // propagate through entire scene graph any app changes
    webgl.onAppDidUpdate(oldProps, oldState, this.props, this.state);
  }

  componentDidMount() {
    // To avoid page pulling, text highlighting and such
    webgl.canvas.addEventListener("touchstart", this.handlePreventDefault);
    webgl.canvas.addEventListener("mousedown", this.handlePreventDefault);

    this.loadAudio();
    this.loadWebGL();

    // Update song current time
    setInterval(() => {
      this.updateNowPlaying();
    }, 200);
  }

  componentWillUnmount() {
    webgl.canvas.removeEventListener("touchstart", this.handlePreventDefault);
    webgl.canvas.removeEventListener("mousedown", this.handlePreventDefault);
  }

  loadAudio() {
    const song = {
      id: "dancing-with-kadafi",
    };
    const player = createPlayer(`assets/music/${song.id}.mp3`);

    const audioUtil = createAnalyser(player.node, player.context, {
      stereo: false,
    });

    audioUtil.analyser.fftSize = this.props.frequencyBins * 2;

    player.on("load", () => {
      console.log("Audio loaded...");
      player.node.connect(player.context.destination);
      this.setState({
        nowPlaying: {
          title: song.id,
          currentTime: 0,
          duration: player.duration,
          audio: player,
          audioUtil: audioUtil,
        },
      });
    });
  }

  updateNowPlaying() {
    if (this.state.nowPlaying.audio) {
      const currentTime = this.state.nowPlaying.audio.currentTime; // In seconds
      const currentTagsIndex = Math.floor(currentTime / this.props.tagDuration);
      const currentTags = objectMap(
        songTags,
        (tagList) => tagList[currentTagsIndex]
      );
      this.setState({
        nowPlaying: {
          ...this.state.nowPlaying,
          currentTime,
          tags: currentTags,
        },
      });
      // console.log(currentTags);
    }
  }

  loadWebGL() {
    // Preload any queued assets
    assets.loadQueued(() => {
      // Do some fake delay for demo purposes
      setTimeout(() => {
        // Once loading is complete, swap to Muser section and ensure WebGL displays
        this.setState({
          section: "Muser",
          isLoaded: true,
        });
      }, this.props.fakePreloadTime);

      // Add any "WebGL components" here...
      webgl.scene.add(new MuserVisualizer());
    });
  }

  handelMaterialSwap = () => {
    this.setState({ isAltMaterial: !this.state.isAltMaterial });
  };

  handleToggleAudio = () => {
    if (this.state.isPlaying) this.state.nowPlaying.audio.pause();
    else this.state.nowPlaying.audio.play();

    this.setState({
      isPlaying: !this.state.isPlaying,
    });
  };

  getContent(section) {
    // You are probably better off using a real "Router" for history push etc.
    // NB: Ensure there is a 'key' attribute so transition group can create animations
    switch (section) {
      case "Preloader":
        return <Preloader key="Preloader" />;

      default:
      case "Landing":
        return (
          <Landing key="Landing" onMaterialSwap={this.handelMaterialSwap} />
        );
      case "Muser":
        return (
          <Muser
            key="Muser"
            onTogglePlay={this.handleToggleAudio}
            isPlaying={this.state.isPlaying}
            nowPlaying={this.state.nowPlaying}
          />
        );
    }
  }

  render() {
    const classes = classnames({
      App: true,
    });

    const section = this.state.section;
    const content = this.getContent(section);

    // Render the WebGL if loaded
    // And also render the current UI section on top, with transitions
    return (
      <div
        className={classes}
        ref={(c) => {
          this.container = c;
        }}
      >
        {this.state.isLoaded && <WebGLCanvas />}
        <PreactTransitionGroup className="content">
          {content}
        </PreactTransitionGroup>
      </div>
    );
  }
}

App.defaultProps = {
  // Artificially inflate preload time so
  // we can see it for demo purposes
  fakePreloadTime: 1250,
  frequencyBins: 64,
  tagDuration: 1,
};

module.exports = App;
