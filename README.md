# Image Rating App

## 项目概述

Image Rating App 是一个基于 Electron 和 Web 技术构建的桌面应用程序，用于对图片进行评级。该应用允许用户加载图片，根据预定义的评级选项对图片进行评级，并将评级结果保存为 CSV 文件。

## 主要功能

1. 加载并显示本地图片
2. 从 CSV 文件加载评级选项
3. 对图片进行评级
4. 在缩略图导航中查看所有图片
5. 保存评级结果为 CSV 文件

## 技术栈

- Electron: 用于创建跨平台桌面应用
- Express: 用于处理后端 API 请求
- Vite: 用于前端开发和构建
- HTML/CSS/JavaScript: 用于前端界面开发

## 项目结构
```
image-rating-app/
├── public/
│ ├── images/ # 存放待评级的图片
│ ├── index.html # 主 HTML 文件
│ ├── styles.css # 全局样式
│ └── app.js # 主应用逻辑
├── src/
│ ├── main.js # 前端主逻辑
│ ├── api.js # API 请求函数
│ └── styles.css # 前端样式
├── main.js # Electron 主进程
├── preload.js # Electron 预加载脚本
├── server.js # Express 服务器
├── vite.config.js # Vite 配置
├── package.json # 项目依赖和脚本
└── rating_options.csv # 评级选项 CSV 文件
```

## 安装和运行

1. 克隆仓库:
   ```
   git clone https://github.com/YeyouminTian/Image-Annotation-App.git
   cd image-rating-app
   ```

2. 安装依赖:
   ```
   npm install
   ```

3. 运行应用:
   ```
   npm start
   ```

## 使用说明

1. 启动应用后，选择包含图片的文件夹和评级选项 CSV 文件。

![初始页面](https://md-1306736402.cos.ap-nanjing.myqcloud.com/OBLifeOS/202410102225131.png)

2. 点击 "Start Rating" 按钮开始评级过程。

![评级页面](https://md-1306736402.cos.ap-nanjing.myqcloud.com/OBLifeOS/202410102226383.png)

3. 使用左侧的缩略图导航或 "Previous" 和 "Next" 按钮浏览图片。
4. 点击评级按钮为当前图片评级。
5. 完成评级后，点击 "Save Ratings" 按钮将结果保存为 CSV 文件。

## 评级选项 CSV 格式

评级选项 CSV 文件应包含两列：标准和编码。例如：
```
标准,编码
非常差,1
差,2
一般,3
好,4
非常好,5
```
## 输出 CSV 格式

输出的 CSV 文件包含三列：image, label, label_code。例如：
```
image,label,label_code
image1.jpg,好,5
image2.jpg,非常好,5
image3.jpg,非常好,5
```

## 开发

- 安装依赖: `npm install`
- 运行开发版本: `npm start`
- 构建应用: `npm run make`

## 注意事项

- 确保选择的文件夹中包含要标注的图片。
- 标注选项 CSV 文件应按照指定格式创建。
- 应用会按照文件名的顺序处理图片。

## 贡献

欢迎提交 issues 和 pull requests 来改进这个项目。

## 许可证

[MIT License](LICENSE)