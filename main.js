const { app, BrowserWindow, ipcMain, dialog } = require('electron');

const path = require('path');

const url = require('url');

const fs = require('fs').promises;

const iconv = require('iconv-lite');

try {
  const jschardet = require('jschardet');
} catch (error) {
  console.error('Error loading jschardet:', error);
  // 你可以在这里添加更多的错误处理逻辑
}


function createWindow() {

  const mainWindow = new BrowserWindow({

    width: 800,

    height: 600,

    webPreferences: {

      nodeIntegration: false,

      contextIsolation: true,

      preload: path.join(__dirname, 'preload.js')

    }

  });



  mainWindow.loadFile('public/index.html');



  // 修改 CSP 设置

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {

    callback({

      responseHeaders: {

        ...details.responseHeaders,

        'Content-Security-Policy': [

          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;"

        ]

      }

    });

  });



  // 注释掉或删除下面这行代码

  // mainWindow.webContents.openDevTools();

}



app.whenReady().then(createWindow);



// 其他 app 事件处理...



// IPC 处理程序

ipcMain.handle('select-folder', async () => {

  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });

  return result.filePaths[0];

});



ipcMain.handle('select-csv', async () => {

  const result = await dialog.showOpenDialog({

    properties: ['openFile'],

    filters: [{ name: 'CSV', extensions: ['csv'] }]

  });

  return result.filePaths[0];

});



// 新增的 IPC 处理程序

ipcMain.handle('get-images', async (event, folderPath) => {

  const files = await fs.readdir(folderPath);

  const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

  

  // 使用自然排序算法对文件名进行排序

  const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});

  imageFiles.sort(collator.compare);



  return imageFiles.map(file => ({

    name: file,

    path: path.join(folderPath, file)

  }));

});



// 修改 getAnnotationOptions 函数

async function getAnnotationOptions(csvPath) {

  try {

    const content = await fs.readFile(csvPath, 'utf8');

    const lines = content.split('\n').filter(line => line.trim() !== '');

    // 移除表头

    lines.shift();

    const results = [];



    for (const line of lines) {

      const [label, labelCode] = line.split(',').map(item => item.trim());

      if (label && labelCode) {

        results.push({ label, labelCode });

      }

    }



    console.log('Parsed annotation options:', results);

    return results;

  } catch (error) {

    console.error('Error reading annotation options:', error);

    throw error;

  }

}



// 修改保存注释的函数

ipcMain.handle('save-annotations', async (event, csvContent) => {

  const savePath = await dialog.showSaveDialog({

    filters: [{ name: 'CSV', extensions: ['csv'] }]

  });

  

  if (savePath.filePath) {

    const header = 'image,label,label_code\n';  // 新的列名

    const content = header + csvContent;

    console.log('CSV content before encoding:', content);

    // 使用 UTF-8 编码，添加 BOM

    const buffer = Buffer.concat([Buffer.from('\uFEFF', 'utf8'), Buffer.from(content, 'utf8')]);

    await fs.writeFile(savePath.filePath, buffer);

    console.log('File saved successfully');

    return true;

  }

  return false;

});



// 在其他 IPC 处理程序后添加这个

ipcMain.handle('show-save-dialog', async () => {

  const result = await dialog.showSaveDialog({

    filters: [{ name: 'CSV', extensions: ['csv'] }]

  });

  return !result.canceled;

});



// 在其他 IPC 处理程序附近添加这个

ipcMain.handle('get-annotation-options', async (event, csvPath) => {

  try {

    const options = await getAnnotationOptions(csvPath);

    return options;

  } catch (error) {

    console.error('Error in get-annotation-options handler:', error);

    throw error;

  }

});



