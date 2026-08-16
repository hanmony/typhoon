const shpjs = require('shpjs');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const shpDir = path.resolve(__dirname, 'src/assets/shape');


function toArrayBuffer(buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return arrayBuffer;
}

function output(dir, name, fileObject) {
  const string = JSON.stringify(fileObject, 4);
  fsp.writeFile(dir + '/' + name, string).then(() => {
    console.log('writeFileSuccess', name)
  }).catch((err) => {
    console.log('writeFileError', err)
  })

}

fsp.readFile(shpDir + '/provincial-administration-regions-2020.zip').then((data) => {
  const arrayBuffer = toArrayBuffer(data);
  shpjs(arrayBuffer).then((geojson) => {
    // console.log(geojson)
    output(shpDir, 'provincial-administration-regions-2020.json', geojson);
  }).catch((err) => {
    console.log('shpjsError', err)
  })
}).catch((err) => {
  console.log('readFileError', err)
})
