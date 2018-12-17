const imageMainFolder = process.argv[2].replace(/\/$/, '');
const textMainFolder = process.argv[3].replace(/\/$/, '');

const fs = require('fs');
const Path = require('path');
const glob = require('glob');
const naturalSort = require('javascript-natural-sort');

let result = '';
let resultCount = 0;
let divisionName = '';
let volumeInfo = '';

const imageFolders = fs.readdirSync(imageMainFolder, 'utf8').sort(naturalSort);

imageFolders.forEach(imageFolder => {

  const folderRoute = `${imageMainFolder}/${imageFolder}`;
  if (fs.lstatSync(folderRoute).isFile()) {
    return;
  };

  const imageFileNames = {};
  glob.sync(`${folderRoute}/**/*.jpg`)
    .filter(route => /\d+-\d+-\d+[abcd]\.jpg/.exec(route))
    .forEach(route => {
      const imageFileName = Path.basename(route, '.jpg');
      imageFileNames[imageFileName] = true;
    });

  const textFolder = imageFolder.replace(/-\d+$/, '');
  const textRoutes = glob.sync(`${textMainFolder}/${textFolder}/**/*.xml`).sort(naturalSort);

  let pbs = [];

  textRoutes.forEach(textRoute => {

    const text = fs.readFileSync(textRoute, 'utf8');

    divisionName = getDivisionName(text) || divisionName;
    volumeInfo = getVolumeInfo(text, divisionName) || volumeInfo;

    const pbsSubset = text.replace(/<pb/g, 'delim~!@#$%<pb').split('delim~!@#$%');
    pbs = pbs.concat(pbsSubset.slice(1));
  });

  result += `${volumeInfo}\n\n============================================================\n\n`;

  pbs.forEach(pb => {

    const pbId = /<pb id="(.+?)"/.exec(pb)[1];
    const hasImage = imageFileNames[pbId];
    const pbHasText = pb.replace(/<[^>]+?>/g, '')
      .replace(/[a-zA-Z0-9]+/g, '')
      .trim();

    if (! hasImage) {

      if (resultCount > 0) {
        result += '\n\n';
      }

      result += `${pbId} 目前圖檔版本的這一頁缺圖。\n\n`;

      resultCount = 0;
    }
    else if (! pbHasText) {

      if (resultCount > 0) {
        result += '\n\n';
      }

      result += `${pbId} 目前圖檔版本的這一頁可能沒有文字；或目前圖檔版本的這一頁缺圖，所以暫時用空白的圖檔代替。\n\n`;

      resultCount = 0;
    }
    else {
      result += `${pbId} , `;
      resultCount++;

      if (6 === resultCount) {
        result += '\n\n';
        resultCount = 0;
      }
    }

    delete imageFileNames[pbId];
  });

  result += '\n\n============================================================\n\n';

  checkImageHasNoPb(imageFileNames);
});

function getDivisionName(text) {
  if (/<division/.test(text)) {
    return /<division[^>]+?tw="(.+?)"/.exec(text)[1];
  }
  return null;
}

function getVolumeInfo(text, divisionName) {
  if (/<vol/.test(text)) {
    const volumeN = /<vol n="(.+?)"/.exec(text)[1];
    const boName = /<vol[^>]+?bo="(.+?)"/.exec(text)[1];
    return `第 ${volumeN} 函, ${divisionName} ${boName}`;
  }
  return null;
}

function checkImageHasNoPb(leftImageFileNames) {
  let fileNames = Object.keys(leftImageFileNames);
  if (fileNames.length > 0) {
    console.log('These image has no pb text: ' + fileNames.join(', '));
  }
}

fs.writeFileSync(`./result.txt`, result, 'utf8');