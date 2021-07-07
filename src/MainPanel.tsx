import React, { PureComponent, createRef } from 'react';
import { PanelProps } from '@grafana/data';
import { PanelOptions } from 'types';
import { nanoid } from 'nanoid';
import L, { Map } from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-toolbar/dist/leaflet.toolbar-src.js';
import 'leaflet-toolbar/dist/leaflet.toolbar-src.css';
import 'leaflet-distortableimage/dist/leaflet.distortableimage.js';
import 'leaflet-distortableimage/dist/leaflet.distortableimage.css';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.min.js';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { jsFileDownloader } from 'js-client-file-downloader';
import SVGWrapper from './icons/SVGWrapper';
import Load from './icons/Load';
import EditImg from './icons/EditImg';
import Draw from './icons/Draw';
import Tag from './icons/Tag';
import Download from './icons/Download';
import Ruler from './images/measure.svg';
import Noruler from './images/clear.svg';
import Close from './images/close.svg';
import './css/main.css';

interface Props extends PanelProps<PanelOptions> {}
interface State {
  mode: string;
  selectFeature: any | null;
  key: string;
  value: string;
  editFieldPos: [number, number];
  editFieldValue: string;
  properties: { key: string; value: string }[];
}

L.Polyline = L.Polyline.include({
  getDistance: function(system: any) {
    // distance in meters
    var mDistanse = 0,
      length = this._latlngs.length;
    for (var i = 1; i < length; i++) {
      mDistanse += this._latlngs[i].distanceTo(this._latlngs[i - 1]);
    }
    // optional
    if (system === 'imperial') {
      return mDistanse / 1609.34;
    } else {
      return mDistanse / 1000;
    }
  },
});

function squareEditable(row: number, col: number, editField: [number, number]) {
  return row == editField[0] && col == editField[1];
}

export class MainPanel extends PureComponent<Props, State> {
  id = 'id' + nanoid();
  map: Map;
  img: any;
  inputFile = createRef<HTMLInputElement>();
  inputField = createRef<HTMLInputElement>();
  measureLayer: L.FeatureGroup;

  state: State = {
    mode: 'None',
    selectFeature: null,
    key: '',
    value: '',
    editFieldPos: [-1, 0],
    editFieldValue: '',
    properties: [],
  };

  componentDidMount() {
    const { center_lat, center_lon, zoom } = this.props.options;
    //@ts-ignore
    this.map = L.map(this.id).setView([center_lat, center_lon], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxNativeZoom: 18,
      maxZoom: 26,
    }).addTo(this.map);

    this.measureLayer = new L.FeatureGroup();
    this.map.addLayer(this.measureLayer);

    //@ts-ignore
    var drawControl = new L.Control.Draw({
      draw: false,
    });
    this.map.addControl(drawControl);

    //@ts-ignore
    this.map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawRectangle: false,
      cutPolygon: false,
    });

    //@ts-ignore
    this.map.pm.toggleControls();

    this.map.on('pm:create', e => {
      e.layer.on('click', (e: L.LeafletEvent) => {
        const shape = e.target;
        if (this.state.mode != 'Tag') return;
        // let label = '';
        // if (shape.feature && shape.feature.properties) label = shape.feature.properties.name;

        let properties: { key: string; value: string }[] = [];
        if (shape.feature) {
          properties = Object.keys(shape.feature.properties).map(item => ({
            key: item,
            value: shape.feature.properties[item],
          }));
        }
        this.setState(
          prev => ({ ...prev, selectFeature: shape, properties }),
          () => {
            this.inputField.current?.focus();
          }
        );
      });
    });

    this.map.on('draw:created', e => {
      const distance = (e.layer.getDistance() * 1000).toFixed(2) + ' m';
      e.layer.bindTooltip(distance, {
        permanent: true,
        offset: [0, 12],
        backgroundColor: 'rgba(0, 0, 0, 0);',
      });
      this.measureLayer.addLayer(e.layer);
    });
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (
      prevProps.options.center_lat !== this.props.options.center_lat ||
      prevProps.options.center_lon !== this.props.options.center_lon
    ) {
      const { center_lat, center_lon } = this.props.options;
      this.map.panTo([center_lat, center_lon], {
        animate: true,
        duration: 2,
      });
    }

    if (prevState.mode !== this.state.mode) {
      if (prevState.mode == 'Tag') {
        this.setState(prev => ({ ...prev, selectFeature: null, key: '', value: '', properties: [] }));
      }
    }
  }

  uploadImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (this.img) this.map.removeLayer(this.img);

    if (e.target.files) {
      const dropFile = e.target.files[0];
      const reader = new FileReader();

      reader.onload = f => {
        var data = f.target?.result as string;

        const loadedImg = new Image();
        loadedImg.src = data;
        loadedImg.style.opacity = '0.5';

        if (data) {
          //@ts-ignore
          this.img = L.distortableImageOverlay(loadedImg, {
            //@ts-ignore
            actions: [L.FreeRotateAction],
            suppressToolbar: true,
          }).addTo(this.map);

          this.setState({ mode: 'Image' });
        }
      };
      reader.readAsDataURL(dropFile);
    }
  };

  handleClick = (type: string) => () => {
    this.setState(prev => ({ ...prev, mode: type, selectFeature: null, label: '' }));

    if (type == 'Draw') {
      this.img && this.img.editing.disable();

      //@ts-ignore
      if (!this.map.pm.controlsVisible()) this.map.pm.toggleControls();

      //@ts-ignore
      this.map.pm.enableDraw();
      return;
    }

    if (type == 'Upload') {
      this.inputFile.current?.click();
    }

    if (type == 'Image') {
      this.img && this.img.editing.enable();
    }

    if (type == 'Tag') {
      //@ts-ignore
      this.map.pm.disableDraw();
      this.img && this.img.editing.disable();
    }

    if (type == 'Download') {
      //@ts-ignore
      var layers = this.map.pm.getGeomanDrawLayers();
      if (layers.length == 0) return;
      var group = L.featureGroup();
      layers.forEach((layer: any) => {
        group.addLayer(layer);
      });
      const shapes = group.toGeoJSON();

      jsFileDownloader.makeJSON(shapes, 'floorplan');
    }
    //@ts-ignore
    if (this.map.pm.controlsVisible()) this.map.pm.toggleControls();
  };

  handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // @ts-ignore
    this.setState({ [name]: value });
  };

  onAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { key, value, properties, selectFeature } = this.state;
    if (e.key == 'Enter' && key && value) {
      if (!selectFeature.feature) {
        selectFeature.feature = {};
        selectFeature.feature.type = 'Feature';
        selectFeature.feature.properties = { [key]: value };
      } else {
        const clone = { ...selectFeature.feature.properties, [key]: value };
        selectFeature.feature.properties = clone;
      }

      this.setState(
        prev => ({ ...prev, key: '', value: '', properties: [...properties, { key, value }] }),
        () => {
          this.inputField.current?.focus();
        }
      );
    }
  };

  onMeasure = () => {
    //@ts-ignore
    const drawer = new L.Draw.Polyline(this.map, { precision: { m: 2 } });
    drawer.enable();
  };

  clearMeasure = () => {
    this.measureLayer.clearLayers();
  };

  closeAttrTab = () => {
    this.setState(prev => ({ ...prev, selectFeature: null, key: '', value: '', properties: [] }));
  };

  activeSquare = (row: number, col: number, fieldValue: string) => () => {
    this.setState(prevState => ({ ...prevState, editFieldPos: [row, col], editFieldValue: fieldValue }));
  };

  editSquareField = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { editFieldPos, editFieldValue, properties, selectFeature } = this.state;
    if (e.key === 'Enter') {
      if (editFieldPos[1] == 0 && editFieldValue == '') {
        const keyValue = properties[editFieldPos[0]].key;

        const arr = properties.slice(0);
        arr.splice(editFieldPos[0], 1);

        delete selectFeature.feature.properties[keyValue];
        this.setState(prevState => ({ ...prevState, editFieldPos: [-1, 0], editFieldValue: '', properties: arr }));
        return;
      }

      const arr = properties.slice(0);
      const key = editFieldPos[1] == 0 ? 'key' : 'value';

      const keyValue = arr[editFieldPos[0]].key;
      const valValue = arr[editFieldPos[0]].value;

      if (editFieldPos[1] == 0) {
        delete selectFeature.feature.properties[keyValue];
        selectFeature.feature.properties[editFieldValue] = valValue;
      } else {
        selectFeature.feature.properties[keyValue] = editFieldValue;
      }

      arr[editFieldPos[0]][key] = editFieldValue;
      this.setState(prevState => ({ ...prevState, editFieldPos: [-1, 0], editFieldValue: '', properties: arr }));
    }
  };

  render() {
    const { width, height } = this.props;
    const { mode, selectFeature, key, value, properties, editFieldPos, editFieldValue } = this.state;

    return (
      <div style={{ position: 'relative' }}>
        <div id={this.id} style={{ height, width, zIndex: 1 }}></div>

        <div style={{ position: 'absolute', bottom: 5, left: 5, zIndex: 2, display: 'flex' }}>
          <SVGWrapper label="Upload Image" handleClick={this.handleClick('Upload')}>
            <Load />
          </SVGWrapper>
          <input type="file" ref={this.inputFile} style={{ display: 'none' }} onChange={this.uploadImg} />
          <SVGWrapper label="Edit Image" handleClick={this.handleClick('Image')}>
            <EditImg mode={mode} />
          </SVGWrapper>
          <SVGWrapper label="Drawing" handleClick={this.handleClick('Draw')}>
            <Draw mode={mode} />
          </SVGWrapper>
          <SVGWrapper label="Add Label" handleClick={this.handleClick('Tag')}>
            <Tag mode={mode} />
          </SVGWrapper>
          <SVGWrapper label="Download" handleClick={this.handleClick('Download')}>
            <Download mode={mode} />
          </SVGWrapper>
        </div>
        <div style={{ position: 'absolute', top: 5, right: 5, zIndex: 2, caretColor: 'transparent' }}>
          <img
            src={Ruler}
            style={{
              background: '#fff',
              padding: '0 3px 0 3px',
              borderRadius: 3,
              border: '1px solid #ccc',
              cursor: 'pointer',
            }}
            onClick={this.onMeasure}
          />
          <img
            src={Noruler}
            style={{
              background: '#fff',
              padding: '0 3px 0 3px',
              borderRadius: 3,
              border: '1px solid #ccc',
              cursor: 'pointer',
            }}
            onClick={this.clearMeasure}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            display: selectFeature ? 'block' : 'none',
            padding: 5,
            bottom: 5,
            left: '50%',
            marginLeft: -200,
            zIndex: 3,
          }}
        >
          <div style={{ position: 'relative' }}>
            <img
              src={Close}
              style={{ position: 'absolute', top: -10, right: -10, cursor: 'pointer' }}
              onClick={this.closeAttrTab}
            />

            <div style={{ width: 400, display: 'flex', flexDirection: 'column' }}>
              <div>
                <input
                  ref={this.inputField}
                  type="text"
                  name="key"
                  placeholder="Key"
                  style={{ padding: '5px 10px', border: '1px solid #444', borderRadius: '3px 0 0 0', width: '50%' }}
                  onChange={this.handleChange}
                  value={key}
                />
                <input
                  type="text"
                  name="value"
                  placeholder="Value"
                  style={{
                    padding: '5px 10px',
                    border: '1px solid #444',
                    borderLeft: 0,
                    borderRadius: '0 3px 0 0',
                    width: '50%',
                  }}
                  onChange={this.handleChange}
                  onKeyPress={this.onAddTag}
                  value={value}
                />
              </div>
              {properties.map((pair, i) => (
                <div style={{ display: 'flex', background: '#fff' }} key={i}>
                  {squareEditable(i, 0, editFieldPos) ? (
                    <input
                      style={{
                        width: '50%',
                        border: '1px solid #444',
                        borderTop: 0,
                        padding: '5px 10px',
                        background: '#d6e6e6',
                      }}
                      autoFocus
                      name="editFieldValue"
                      value={editFieldValue}
                      onChange={this.handleChange}
                      onKeyPress={this.editSquareField}
                    />
                  ) : (
                    <div
                      style={{
                        width: '50%',
                        border: '1px solid #444',
                        borderTop: 0,
                        padding: '5px 10px',
                        caretColor: 'transparent',
                      }}
                      onDoubleClick={this.activeSquare(i, 0, pair.key)}
                    >
                      {pair.key}
                    </div>
                  )}

                  {squareEditable(i, 1, editFieldPos) ? (
                    <input
                      style={{
                        width: '50%',
                        padding: '5px 10px',
                        borderRight: '1px solid #444',
                        borderBottom: '1px solid #444',
                        background: '#d6e6e6',
                      }}
                      autoFocus
                      name="editFieldValue"
                      value={editFieldValue}
                      onChange={this.handleChange}
                      onKeyPress={this.editSquareField}
                    />
                  ) : (
                    <div
                      style={{
                        width: '50%',
                        padding: '5px 10px',
                        borderRight: '1px solid #444',
                        borderBottom: '1px solid #444',
                        caretColor: 'transparent',
                      }}
                      onDoubleClick={this.activeSquare(i, 1, pair.value)}
                    >
                      {pair.value}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
