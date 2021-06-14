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
import './css/main.css';

interface Props extends PanelProps<PanelOptions> {}
interface State {
  mode: string;
  selectFeature: any | null;
  label: string;
}

// L.Polyline = L.Polyline.include({
//   getDistance: function(system: any) {
//     // distance in meters
//     var mDistanse = 0,
//       length = this._latlngs.length;
//     for (var i = 1; i < length; i++) {
//       mDistanse += this._latlngs[i].distanceTo(this._latlngs[i - 1]);
//     }
//     // optional
//     if (system === 'imperial') {
//       return mDistanse / 1609.34;
//     } else {
//       return mDistanse / 1000;
//     }
//   },
// });

export class MainPanel extends PureComponent<Props, State> {
  id = 'id' + nanoid();
  map: Map;
  img: any;
  inputFile = createRef<HTMLInputElement>();
  inputField = createRef<HTMLInputElement>();
  measureLayer: L.FeatureGroup;

  state: State = {
    mode: 'Draw',
    selectFeature: null,
    label: '',
  };

  componentDidMount() {
    const { center_lat, center_lon, zoom } = this.props.options;
    //@ts-ignore
    this.map = L.map(this.id).setView([center_lat, center_lon], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxNativeZoom: 18,
      maxZoom: 21,
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

    this.map.on('pm:create', e => {
      e.layer.on('click', (e: L.LeafletEvent) => {
        const shape = e.target;
        if (this.state.mode != 'Tag') return;
        let label = '';
        if (shape.feature && shape.feature.properties) label = shape.feature.properties.name;
        this.setState(
          prev => ({ ...prev, selectFeature: shape, label }),
          () => {
            this.inputField.current?.focus();
          }
        );
      });
    });

    this.map.on('draw:created', e => {
      // const distance = (e.layer.getDistance() * 1000).toFixed(2);
      // e.layer.bindTooltip(distance, {
      //   permanent: true,
      //   offset: [0, 12],
      //   backgroundColor: 'rgba(0, 0, 0, 0);',
      // });
      this.measureLayer.addLayer(e.layer);
    });
  }

  componentDidUpdate(prevProps: Props) {}

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

    if (type == 'Upload') {
      this.inputFile.current?.click();
    }

    if (type == 'Image') {
      this.img && this.img.editing.enable();
    }

    if (type == 'Draw') {
      this.img && this.img.editing.disable();
      //@ts-ignore
      this.map.pm.enableDraw();
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
      console.log('geoman shapes ', shapes);
      jsFileDownloader.makeJSON(shapes, 'floorplan');
    }
  };

  handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    this.setState({ label: value });
  };

  onAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key == 'Enter') {
      const { selectFeature, label } = this.state;

      if (label == '') return;

      selectFeature.feature = {};
      selectFeature.feature.type = 'Feature';
      selectFeature.feature.properties = { name: label };

      this.setState(prev => ({ ...prev, selectFeature: null, label: '' }));
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

  render() {
    const { width, height } = this.props;
    const { mode, selectFeature, label } = this.state;

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
          {/* <button onClick={this.onMeasure}>Measure</button> */}
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
            bottom: 5,
            right: width / 2,
            zIndex: 3,
          }}
        >
          <input
            ref={this.inputField}
            type="text"
            onChange={this.handleChange}
            onKeyPress={this.onAddTag}
            value={label}
            style={{ padding: '10px 20px', borderRadius: 3, border: '1px solid #444' }}
          />
        </div>
      </div>
    );
  }
}
