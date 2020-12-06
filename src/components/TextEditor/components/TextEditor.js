import React from "react";
import ReactModal from "react-modal";
import * as fetch from "../../../lib/fetch.js";
import sketch from "../../../lib/";
import { ControlledEditor } from "@monaco-editor/react";
import EditorRadio from "./EditorRadio.js";
import ShareSketchModal from "./ShareSketchModal";
import { Button } from "reactstrap";
import OpenPanelButtonContainer from "../../common/containers/OpenPanelButtonContainer";
import { EDITOR_WIDTH_BREAKPOINT } from "../../../constants";
import ViewportAwareButton from "../../common/ViewportAwareButton.js";
import DropdownButtonContainer from "../../common/containers/DropdownButtonContainer";
import { faDownload, faSave, faShare, faCodeBranch } from "@fortawesome/free-solid-svg-icons";
import { SketchThumbnailArray } from "../../Sketches/constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Redirect } from "react-router-dom";
import { addMonacoComments } from "../../../actions/programsActions.js";

class TextEditor extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      editorInstance: null,
      currentLine: 0,
      sketch: null,
      showForkModal: false,
      forking: false,
      forked: false,
      redirectToSketch: false,
      showShareModal: false,
    };
  }

  //==============React Lifecycle Functions===================//

  componentDidMount() {
    window.addEventListener("beforeunload", this.onLeave);
    window.addEventListener("close", this.onLeave);
  }

  componentWillUnmount = () => {
    window.removeEventListener("beforeunload", this.onLeave);
    window.removeEventListener("close", this.onLeave);
  };

  openForkModal = () => {
    this.setState({ showForkModal: true });
  };

  closeForkModal = () => {
    this.setState({ showForkModal: false });
  };

  checkDirty = async () => {
    if (!this.props.dirty) {
      return;
    }

    try {
      let programToUpdate = {};
      programToUpdate[this.props.mostRecentProgram] = {
        code: this.props.code, ///%%might have to check if the code doesnt get transferred properly
      };

      await fetch.updatePrograms(this.props.uid, programToUpdate);
      //TODO: add functionality to be able to tell whether the fetch failed
    } catch (err) {
      console.log(err);
    }
  };

  onLeave = async (ev) => {
    if (this.props.dirty) {
      ev.returnValue = "";
    }
    return ev;
  };

  setEditorInstance = (editorInstance) => {
    this.setState({ editorInstance });
  };

  renderForkModal = () => {
    return (
      <ReactModal
        isOpen={this.state.showForkModal}
        onRequestClose={this.closeForkModal}
        className="fork-modal"
        overlayClassName="profile-image-overlay"
        ariaHideApp={false}
      >
        <h1 className="text-center">Fork This Sketch</h1>
        {!(this.state.forking || this.state.forked) && (
          <p className="text-center">Would you like to create your own copy of this sketch?</p>
        )}
        {this.state.forking ? (
          <p className="text-center">Forking...</p>
        ) : this.state.forked ? (
          <div>
            <p className="text-center">Sketch forked! Go to your sketches to see your new copy!</p>
            <Button color="danger" size="lg" onClick={this.closeForkModal} block>
              Close
            </Button>
            <Button color="success" size="lg" onClick={this.redirectSketch} block>
              Go to Sketches
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <Button color="danger" size="lg" onClick={this.closeForkModal} block>
              Cancel
            </Button>
            <Button color="success" size="lg" onClick={this.handleFork} block>
              Fork
            </Button>
          </div>
        )}
      </ReactModal>
    );
  };

  handleFork = async () => {
    this.setState({ forking: true });
    let data = {
      uid: this.props.uid,
      thumbnail: this.props.vthumbnail,
      language: this.props.vlanguage,
      name: this.props.sketchName,
      code: this.props.code,
    };

    try {
      fetch
        .createSketch(data)
        .then((res) => {
          return res.json();
        })
        .then((json) => {
          if (!json.ok) {
            this.setState({
              error: json.error || "Failed to create sketch, please try again later",
            });
            return;
          }
          this.setState({ forking: false, forked: true });
          this.props.addProgram(json.data.key, json.data.programData || {});
        })
        .catch((err) => {
          this.setState({
            error: "Failed to create sketch, please try again later",
          });
          console.log(err);
        });
    } catch (err) {
      console.log(err);
    }
  };

  redirectSketch = () => {
    this.closeForkModal();
    this.setState({ redirectToSketch: true });
  };

  toggleShareModal = () => {
    this.setState((prevState) => ({ showShareModal: !prevState.showShareModal }));
  };

  //returns a theme based on light or dark mode for vs code name
  getCMTheme = (theme) => {
    switch (theme) {
      case "light":
        return "duotone-light";
      case "dark":
      default:
        return "vs-dark"; //%% these themes can be changed if you dont like the color
    }
  };

  renderDropdown = () => <DropdownButtonContainer />;

  renderSketchName = () => <div className="program-sketch-name">{this.props.sketchName}</div>;

  renderBanner = () => {
    let thumbnail =
      SketchThumbnailArray[this.props.viewOnly ? this.props.vthumbnail : this.props.thumbnail];
    return (
      <div className="code-section-banner">
        <OpenPanelButtonContainer />
        <img
          className="program-sketch-thumbnail"
          src={`${process.env.PUBLIC_URL}/img/sketch-thumbnails/${thumbnail}.svg`}
          alt="sketch thumbnail"
        />
        {this.props.viewOnly ? this.renderSketchName() : this.renderDropdown()}
        <div style={{ marginLeft: "auto", marginRight: ".5rem" }}>
          <EditorRadio
            viewMode={this.props.viewMode}
            updateViewMode={this.props.updateViewMode}
            isSmall={this.props.screenWidth <= EDITOR_WIDTH_BREAKPOINT}
          />
        </div>
        {this.props.viewOnly ? (
          this.props.uid ? (
            <ViewportAwareButton
              size="lg"
              onClick={this.openForkModal}
              isSmall={this.props.screenWidth <= EDITOR_WIDTH_BREAKPOINT}
              icon={<FontAwesomeIcon icon={faCodeBranch} />}
              text={"Fork"}
            />
          ) : null
        ) : (
          <ViewportAwareButton
            className="mx-2"
            color="success"
            size="lg"
            onClick={this.props.handleSave}
            isSmall={this.props.screenWidth <= EDITOR_WIDTH_BREAKPOINT}
            icon={<FontAwesomeIcon icon={faSave} />}
            text={this.props.saveText}
          />
        )}
        {!this.props.viewOnly && (
          <ViewportAwareButton
            className="mx-2"
            color="primary"
            size="lg"
            onClick={this.toggleShareModal}
            isSmall={this.props.screenWidth <= EDITOR_WIDTH_BREAKPOINT}
            icon={<FontAwesomeIcon icon={faShare} />}
            text={"Share"}
          />
        )}
        {
          <Button className="mx-2" color="success" size="lg" onClick={this.props.handleDownload}>
            <FontAwesomeIcon icon={faDownload} />
          </Button>
        }
      </div>
    );
  };
  updateCode = (e, newCode) => {
    //if the code's not yet dirty, and the old code is different from the new code, make it dirty
    if (!this.props.dirty && this.props.code !== newCode) {
      this.props.dirtyCode(this.props.mostRecentProgram);
    }
    this.props.setProgramCode(this.props.mostRecentProgram, newCode);
  };

  addComment = (editorInstance) => {
    console.log("Pog adding");
  };

  initComments = (editorInstance) => {
    editorInstance.addAction({
      id: "add_comment",
      label: "Add Comment",
      precondition: "editorHasSelection",
      contextMenuGroupId: "2_comments",
      run: this.addComment,
    });
    debugger;
    const decorations = editorInstance.deltaDecorations(
      [],
      (this.props.comments || []).map(
        ({ startLineNumber, startColumn, endLineNumber, endColumn, message }) => ({
          range: new monaco.Range(startLineNumber, startColumn, endLineNumber, endColumn),
          options: {
            hoverMessage: { value: message },
            inlineClassName: "monaco-comment",
          },
        }),
      ),
    );
    addMonacoComments(this.props.mostRecentProgram, decorations);
  };

  render() {
    if (this.state.redirectToSketch === true) {
      return <Redirect to="/sketches" />;
    }

    const comments = [
      {
        startLine: 7,
        startColumn: 1,
        endLine: 7,
        endColumn: 24,
      },
    ];

    const options = {
      selectOnLineNumbers: true,
    };
    return (
      <div className={`theme-` + this.props.theme} style={{ height: "100%" }}>
        <div className="code-section">
          {this.renderBanner()}
          {this.renderForkModal()}
          <ShareSketchModal
            shareUrl={sketch.constructShareableSketchURL(this.props.mostRecentProgram)}
            showModal={this.state.showShareModal}
            toggleModal={this.toggleShareModal}
          />
          <div
            className="text-editor-container"
            style={{
              height: this.props.screenHeight - 61 - 20,
              minHeight: this.props.screenHeight - 61 - 20,
              maxHeight: this.props.screenHeight - 61 - 20,
            }}
          >
            <ControlledEditor
              language="python"
              options={options}
              theme={this.getCMTheme(this.props.theme)}
              wrappingIndent="indent"
              value={this.props.code}
              editorDidMount={(_, editorInstance) => {
                this.setEditorInstance(editorInstance);
                this.initComments(editorInstance);
              }}
              onChange={this.updateCode}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default TextEditor;
