const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify/sync'); // 改用同步版本
const iconv = require('iconv-lite');
const cors = require('cors');  // 需要安装 cors 包：npm install cors

const createServer = () => {
  const app = express();
  app.use(cors());  // 添加这行来启用 CORS
  app.use(express.json());

  // 添加这行来记录所有请求
  app.use((req, res, next) => {
    console.log(`Received request: ${req.method} ${req.url}`);
    next();
  });

  let selectedCsvPath = '';
  let selectedFolderPath = '';
  let annotationOptions = []; // 添加这行

  app.post('/api/set-paths', (req, res) => {
    const { csvPath, folderPath } = req.body;
    selectedCsvPath = csvPath;
    selectedFolderPath = folderPath;
    console.log('Paths set:', { csvPath, folderPath });
    res.json({ success: true });
  });

  // 将 getRatingOptions 改为 getAnnotationOptions
  async function getAnnotationOptions() {
    try {
      console.log('Reading CSV file:', selectedCsvPath);
      if (!selectedCsvPath) {
        throw new Error('CSV path is not set');
      }
      const data = await fs.readFile(selectedCsvPath);
      console.log('CSV file read successfully');
      
      const encodings = ['utf8', 'gbk', 'gb2312'];
      let decodedData;
      let records;
      
      for (const encoding of encodings) {
        try {
          decodedData = iconv.decode(data, encoding);
          records = await new Promise((resolve, reject) => {
            parse(decodedData, { 
              columns: false, 
              skip_empty_lines: true, 
              from_line: 2  // 从第二行开始，跳过表头
            }, (err, result) => {
              if (err) reject(err);
              else resolve(result);
            });
          });
          console.log(`Decoded CSV data (${encoding}):`, decodedData);
          console.log('Parsed records:', records);
          
          if (Array.isArray(records) && records.length > 0 && records[0].length >= 2) {
            console.log(`Successfully parsed with ${encoding} encoding`);
            break;
          }
        } catch (e) {
          console.log(`Failed to parse with ${encoding} encoding:`, e.message);
        }
      }
      
      if (!Array.isArray(records) || records.length === 0) {
        throw new Error('Failed to parse CSV file with any encoding');
      }
      
      // 修改这里：直接使用第一列作为标签，第二列作为标签代码
      return records.map(record => ({
        '评价标准': record[0],
        '标签编码': record[1]
      })).sort((a, b) => parseInt(b['标签编码']) - parseInt(a['标签编码']));
    } catch (error) {
      console.error('Error reading annotation options:', error);
      throw error;
    }
  }

  // 将 /api/rating-options 改为 /api/annotation-options
  app.get('/api/annotation-options', async (req, res) => {
    try {
      console.log('Fetching annotation options...');
      annotationOptions = await getAnnotationOptions(); // 保存到变量中
      console.log('Annotation options fetched successfully:', annotationOptions);
      if (!Array.isArray(annotationOptions)) {
        throw new Error('Annotation options are not in the expected format');
      }
      res.json(annotationOptions);
    } catch (error) {
      console.error('Error in /api/annotation-options:', error);
      res.status(500).json({ error: 'Failed to load annotation options', details: error.message });
    }
  });

  app.get('/api/images', async (req, res) => {
    try {
      const files = await fs.readdir(selectedFolderPath);
      const images = files
        .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
        .map(file => ({
          name: file,
          url: `file://${path.join(selectedFolderPath, file)}`
        }));
      res.json(images);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load images' });
    }
  });

  // 将 /api/submit-ratings 改为 /api/submit-annotations
  app.post('/api/submit-annotations', async (req, res) => {
    const { annotations, filename, includeLabels } = req.body;
    try {
      // 准备CSV数据
      let csvData;
      if (includeLabels) {
        csvData = [
          ['image', 'label_code', 'label'], // 添加表头
          ...annotations.map(({ image, labelCode }) => {
            const option = annotationOptions.find(opt => opt['标签编码'] === labelCode);
            return [image, labelCode, option ? option['评价标准'] : ''];
          })
        ];
      } else {
        csvData = [
          ['image', 'label_code'], // 添加表头
          ...annotations.map(({ image, labelCode }) => [image, labelCode])
        ];
      }

      // 使用 stringify 的同步版本
      const csv = stringify(csvData, { 
        header: false, // 因为我们已经手动添加了表头
        bom: true // 添加 BOM 以支持 Excel 中的中文
      });

      // 将 CSV 字符串转换为 Buffer，并指定编码为 UTF-8
      const buffer = Buffer.from(csv, 'utf8');

      // 写入文件
      await fs.writeFile(filename, buffer);

      res.json({ success: true, filename });
    } catch (error) {
      console.error('Error saving annotations:', error);
      res.status(500).json({ error: 'Failed to save annotations', details: error.message });
    }
  });

  console.log('Server created with routes:');
  app._router.stack.forEach(r => {
    if (r.route && r.route.path) {
      console.log(`${Object.keys(r.route.methods)} ${r.route.path}`);
    }
  });

  return app;
};

module.exports = createServer;