document.addEventListener('DOMContentLoaded', async () => {
    const selectFolderButton = document.getElementById('select-folder');
    const selectCsvButton = document.getElementById('select-csv');
    const startAnnotationButton = document.getElementById('start-annotation');
    const selectedFolderText = document.getElementById('selected-folder');
    const selectedCsvText = document.getElementById('selected-csv');
    const mainContent = document.querySelector('.main-content');
    const fileSelection = document.getElementById('file-selection');
    const imageContainer = document.getElementById('image-container');
    const annotationContainer = document.getElementById('annotation-container');
    const imageNavigation = document.getElementById('image-navigation');

    let selectedFolderPath = '';
    let selectedCsvPath = '';
    let images = [];
    let currentImageIndex = 0;
    let annotations = {};
    let annotationOptions = [];
    let isSaving = false; // 添加一个标志来防止多次保存

    if (selectFolderButton && selectCsvButton) {
        selectFolderButton.addEventListener('click', async () => {
            const folderPath = await window.electron.ipcRenderer.invoke('select-folder');
            if (folderPath) {
                selectedFolderPath = folderPath;
                selectedFolderText.textContent = `Selected folder: ${folderPath}`;
                checkStartAnnotationEnabled();
            }
        });

        selectCsvButton.addEventListener('click', async () => {
            const csvPath = await window.electron.ipcRenderer.invoke('select-csv');
            if (csvPath) {
                selectedCsvPath = csvPath;
                selectedCsvText.textContent = `Selected CSV: ${csvPath}`;
                checkStartAnnotationEnabled();
            }
        });
    } else {
        console.error('Select folder or CSV button not found');
    }

    function checkStartAnnotationEnabled() {
        startAnnotationButton.disabled = !(selectedFolderPath && selectedCsvPath);
    }

    startAnnotationButton.addEventListener('click', async () => {
        fileSelection.style.display = 'none';
        mainContent.style.display = 'flex';
        await loadImages();
        await loadAnnotationOptions();
        displayCurrentImage();
        updateImageNavigation();
    });

    async function loadImages() {
        // 这里应该通过 IPC 从主进程获取图片列表
        images = await window.electron.ipcRenderer.invoke('get-images', selectedFolderPath);
        console.log('Loaded images:', images);
    }

    async function loadAnnotationOptions() {
        // 这里应该通过 IPC 从主进程读取 CSV 文件并获取标注选项
        annotationOptions = await window.electron.ipcRenderer.invoke('get-annotation-options', selectedCsvPath);
        console.log('Loaded annotation options:', annotationOptions);
        console.log('First option:', annotationOptions[0]); // 添加这行，查看第一个选项的内容
        displayAnnotationOptions();
    }

    function displayCurrentImage() {
        if (images.length > 0) {
            const currentImage = images[currentImageIndex];
            imageContainer.innerHTML = `<img src="${currentImage.path}" alt="Image ${currentImageIndex + 1}">`;
        } else {
            imageContainer.innerHTML = '<p>No images found</p>';
        }
    }

    function updateImageNavigation() {
        imageNavigation.innerHTML = '';
        images.forEach((image, index) => {
            const button = document.createElement('button');
            button.textContent = `${index + 1}`;
            button.classList.add('image-button');
            if (annotations[image.name]) {
                button.classList.add('annotated');
            }
            button.addEventListener('click', () => {
                currentImageIndex = index;
                displayCurrentImage();
            });
            imageNavigation.appendChild(button);
        });
        console.log('Updated image navigation, annotations:', annotations); // 添加日志
    }

    function displayAnnotationOptions() {
        annotationContainer.innerHTML = '';
        annotationOptions.forEach(option => {
            const button = document.createElement('button');
            console.log('Option:', option);
            
            // 尝试获取标签和值
            let label = '';
            let value = '';
            for (const key in option) {
                if (key.toLowerCase().includes('label') || key.toLowerCase().includes('标准')) {
                    label = option[key];
                } else if (key.toLowerCase().includes('code') || key.toLowerCase().includes('编码')) {
                    value = option[key];
                }
            }
            
            if (!label || !value) {
                console.error('Invalid option:', option);
                return;
            }
            
            button.textContent = label;
            button.dataset.value = value;
            button.classList.add('annotation-button');
            button.addEventListener('click', () => annotateCurrentImage(value));
            annotationContainer.appendChild(button);
        });
        console.log('Annotation options displayed:', annotationOptions);
    }

    function annotateCurrentImage(annotationValue) {
        if (images.length > 0) {
            const currentImage = images[currentImageIndex];
            annotations[currentImage.name] = annotationValue;
            console.log(`Annotated ${currentImage.name} with value ${annotationValue}`);
            console.log('Current annotations:', annotations); // 添加这行
            updateImageNavigation();

            if (currentImageIndex < images.length - 1) {
                currentImageIndex++;
                displayCurrentImage();
            } else if (!isSaving) {
                showSaveDialog();
            }
        }
    }

    async function showSaveDialog() {
        if (isSaving) return; // 如果正在保存，直接返回
        isSaving = true;
        try {
            const save = await window.electron.ipcRenderer.invoke('show-save-dialog');
            if (save) {
                const csvContent = Object.entries(annotations)
                    .map(([imageName, annotation]) => `${imageName},${annotation || ''}`)
                    .join('\n');
                console.log('CSV content:', csvContent); // 添加这行日志
                await window.electron.ipcRenderer.invoke('save-annotations', csvContent);
                console.log('Annotations saved');
            }
        } catch (error) {
            console.error('Error saving annotations:', error);
        } finally {
            isSaving = false;
        }
    }

    // 添加导航按钮功能
    document.getElementById('prev-button').addEventListener('click', () => {
        if (currentImageIndex > 0) {
            currentImageIndex--;
            displayCurrentImage();
        }
    });

    document.getElementById('next-button').addEventListener('click', () => {
        if (currentImageIndex < images.length - 1) {
            currentImageIndex++;
            displayCurrentImage();
        }
    });

    document.getElementById('save-button').addEventListener('click', () => {
        if (!isSaving) {
            showSaveDialog();
        }
    });

});

console.log('app.js loaded');
console.log('Window inner dimensions:', window.innerWidth, window.innerHeight);