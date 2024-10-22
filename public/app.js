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
        try {
            annotationOptions = await window.electron.ipcRenderer.invoke('get-annotation-options', selectedCsvPath);
            console.log('Received annotation options:', annotationOptions);
            if (!Array.isArray(annotationOptions) || annotationOptions.length === 0) {
                console.error('No valid annotation options loaded');
                alert('Failed to load annotation options. Please check your CSV file.');
                return;
            }
            // 添加这行来检查每个选项的内容
            annotationOptions.forEach((option, index) => {
                console.log(`Option ${index + 1}:`, option);
            });
            displayAnnotationOptions();
        } catch (error) {
            console.error('Error loading annotation options:', error);
            alert('Error loading annotation options: ' + error.message);
        }
    }

    function displayCurrentImage() {
        if (images.length > 0) {
            const currentImage = images[currentImageIndex];
            imageContainer.innerHTML = `<img src="${currentImage.path}" alt="Image ${currentImageIndex + 1}">`;
            updateImageNavigation(); // 添加这行
        } else {
            imageContainer.innerHTML = '<p>No images found</p>';
        }
    }

    function updateImageNavigation() {
        imageNavigation.innerHTML = '';
        images.forEach((image, index) => {
            const button = document.createElement('button');
            button.textContent = image.name.split('.')[0]; // 显示文件名（不包括扩展名）
            button.classList.add('image-button');
            if (annotations[image.name]) {
                button.classList.add('annotated');
            }
            if (index === currentImageIndex) {
                button.classList.add('current');
            }
            button.addEventListener('click', () => {
                // 移除之前的 'current' 类
                const currentButton = imageNavigation.querySelector('.current');
                if (currentButton) {
                    currentButton.classList.remove('current');
                }
                // 添加 'current' 类到新选中的按钮
                button.classList.add('current');
                currentImageIndex = index;
                displayCurrentImage();
            });
            imageNavigation.appendChild(button);
        });

        // 滚动到当前图片
        const currentButton = imageNavigation.children[currentImageIndex];
        if (currentButton) {
            currentButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        console.log('Updated image navigation, annotations:', annotations);
    }

    function displayAnnotationOptions() {
        annotationContainer.innerHTML = '';
        if (!Array.isArray(annotationOptions) || annotationOptions.length === 0) {
            console.error('No annotation options to display');
            return;
        }
        annotationOptions.forEach((option) => {
            const button = document.createElement('button');
            
            let label = option.label;
            let value = option.labelCode;
            
            if (!label || !value) {
                console.error('Invalid option:', option);
                return;
            }
            
            button.textContent = label; // 只显示标签，不显示值
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
            const selectedOption = annotationOptions.find(option => option.labelCode === annotationValue);
            const label = selectedOption ? selectedOption.label : '';
            annotations[currentImage.name] = {label: label, labelCode: annotationValue};
            console.log(`Annotated ${currentImage.name} with label ${label} and value ${annotationValue}`);
            console.log('Current annotations:', annotations);
            updateImageNavigation();

            // 找到下一个未标注的图片，从当前位置往后查找
            let nextUnannotatedIndex = images.findIndex((image, index) => 
                index > currentImageIndex && !annotations[image.name]
            );

            // 如果从当前位置往后没有找到未标注的图片，那么从头开始查找
            if (nextUnannotatedIndex === -1) {
                nextUnannotatedIndex = images.findIndex(image => !annotations[image.name]);
            }

            // 如果还是没有找到未标注的图片，说明所有图片都已标注
            if (nextUnannotatedIndex === -1) {
                if (!isSaving) {
                    showSaveDialog();
                }
            } else {
                currentImageIndex = nextUnannotatedIndex;
                displayCurrentImage(); // 使用 displayCurrentImage 替代 updateImageNavigation
            }
        }
    }

    async function showSaveDialog() {
        if (isSaving) return;
        isSaving = true;
        try {
            const csvContent = images
                .map(image => {
                    const annotation = annotations[image.name] || { label: '', labelCode: '' };
                    return `${image.name},${annotation.label},${annotation.labelCode}`;
                })
                .join('\n');
            console.log('CSV content:', csvContent);
            const saved = await window.electron.ipcRenderer.invoke('save-annotations', csvContent);
            if (saved) {
                console.log('Annotations saved');
                alert('Annotations saved successfully!');
            } else {
                console.log('Save cancelled');
            }
        } catch (error) {
            console.error('Error saving annotations:', error);
            alert('Error saving annotations: ' + error.message);
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
