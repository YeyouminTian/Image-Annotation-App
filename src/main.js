console.log('main.js loaded');

let ratingOptions = [];
let images = [];
let currentImageIndex = 0;
let ratings = {};

const startRatingButton = document.getElementById('start-rating');
const mainContent = document.querySelector('.main-content');
const fileSelection = document.getElementById('file-selection');

startRatingButton.addEventListener('click', initializeApp);

async function initializeApp() {
    console.log('initializeApp called');

    try {
        console.log('Loading rating options');
        await loadRatingOptions();
        console.log('Loading images');
        await loadImages();
        console.log(`Loaded ${images.length} images`);
        if (images.length === 0) {
            throw new Error('No images found in the selected folder.');
        }
        mainContent.style.display = 'flex';
        fileSelection.style.display = 'none';
        createImageNavigation();
        displayImage();
        createRatingButtons();
        updateNavigationButtons();
    } catch (error) {
        console.error('Initialization error:', error);
        alert(`Failed to initialize the app: ${error.message}`);
    }
}

async function loadRatingOptions() {
    console.log('loadRatingOptions called');
    try {
        const response = await fetch('/api/rating-options');
        if (!response.ok) {
            throw new Error(`Failed to load rating options: ${response.status} ${response.statusText}`);
        }
        ratingOptions = await response.json();
        console.log('Rating options:', ratingOptions);
    } catch (error) {
        console.error('Error loading rating options:', error);
        throw error;
    }
}

async function loadImages() {
    console.log('loadImages called');
    try {
        const response = await fetch('/api/images');
        if (!response.ok) {
            throw new Error(`Failed to load images: ${response.status} ${response.statusText}`);
        }
        const imageNames = await response.json();
        images = imageNames.map(name => ({
            name: name,
            url: `/images/${encodeURIComponent(name)}`
        }));
        console.log('Images:', images);
    } catch (error) {
        console.error('Error loading images:', error);
        throw error;
    }
}

function createImageNavigation() {
    const navigationContainer = document.getElementById('image-navigation');
    navigationContainer.innerHTML = images.map((image, index) => 
        `<button class="image-button" data-index="${index}">${index + 1}</button>`
    ).join('');

    navigationContainer.addEventListener('click', handleImageNavigation);
}

function handleImageNavigation(event) {
    if (event.target.classList.contains('image-button')) {
        currentImageIndex = parseInt(event.target.dataset.index);
        displayImage();
    }
}

function displayImage() {
    if (images.length === 0 || currentImageIndex < 0 || currentImageIndex >= images.length) {
        console.error('Invalid image index or no images loaded');
        return;
    }
    const imageContainer = document.getElementById('image-container');
    imageContainer.innerHTML = `
        <div class="image-name">${images[currentImageIndex].name}</div>
        <img src="${images[currentImageIndex].url}" alt="Image to rate">
    `;
    updateNavigationButtons();
    updateImageNavigation();
}

function createRatingButtons() {
    const ratingContainer = document.getElementById('rating-container');
    ratingContainer.innerHTML = ratingOptions.map(option => 
        `<button class="rating-button" data-value="${option['标签编码']}">${option['评价标准']}</button>`
    ).join('');

    ratingContainer.addEventListener('click', handleRating);
}

function handleRating(event) {
    if (event.target.classList.contains('rating-button')) {
        const ratingValue = event.target.dataset.value;
        ratings[images[currentImageIndex].name] = ratingValue;
        
        updateImageNavigation();
        
        // Move to next image
        if (currentImageIndex < images.length - 1) {
            currentImageIndex++;
            displayImage();
        }
        
        // Reset button states
        resetRatingButtons();
    }
}

function resetRatingButtons() {
    const buttons = document.querySelectorAll('.rating-button');
    buttons.forEach(button => button.classList.remove('selected'));
}

function updateNavigationButtons() {
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    
    prevButton.disabled = currentImageIndex === 0;
    nextButton.disabled = currentImageIndex === images.length - 1;
}

function updateImageNavigation() {
    const buttons = document.querySelectorAll('.image-button');
    buttons.forEach((button, index) => {
        button.classList.toggle('rated', ratings.hasOwnProperty(images[index].name));
        button.classList.toggle('current', index === currentImageIndex);
    });
}

document.getElementById('prev-button').addEventListener('click', () => {
    if (currentImageIndex > 0) {
        currentImageIndex--;
        displayImage();
    }
});

document.getElementById('next-button').addEventListener('click', () => {
    if (currentImageIndex < images.length - 1) {
        currentImageIndex++;
        displayImage();
    }
});

document.getElementById('save-button').addEventListener('click', async () => {
    const filename = prompt('Enter a filename for the CSV (e.g., ratings.csv):');
    if (filename) {
        const ratingsArray = Object.entries(ratings).map(([image, labelCode]) => ({ image, labelCode }));
        try {
            const response = await fetch('/api/submit-ratings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ratings: ratingsArray, filename }),
            });
            if (!response.ok) {
                throw new Error('Failed to save ratings');
            }
            const result = await response.json();
            alert(`Ratings saved successfully as ${result.filename}`);
        } catch (error) {
            console.error('Error saving ratings:', error);
            alert('Failed to save ratings. Please try again.');
        }
    }
});

// 移除任何自动加载图片或评级选项的代码

const fs = require('fs').promises;
const csv = require('csv-parse/sync');
const iconv = require('iconv-lite');
const jschardet = require('jschardet');

async function getAnnotationOptions(csvPath) {
    try {
        const fileContent = await fs.readFile(csvPath);
        
        // 使用 jschardet 检测文件编码
        const detectedEncoding = jschardet.detect(fileContent);
        console.log('Detected encoding:', detectedEncoding);

        // 尝试多种编码
        const encodings = ['utf-8', 'gbk', 'big5', 'shift_jis', 'utf-16le'];
        let decodedContent;
        let parsedRecords;

        for (const encoding of encodings) {
            try {
                decodedContent = iconv.decode(fileContent, encoding);
                console.log(`Decoded content (${encoding}):`, decodedContent);
                
                parsedRecords = csv.parse(decodedContent, {
                    columns: true,  // 使用第一行作为列名
                    skip_empty_lines: true,
                    trim: true
                });

                if (parsedRecords.length > 0 && parsedRecords[0]['评价标准'] && parsedRecords[0]['标签编码']) {
                    console.log(`Successfully parsed with ${encoding} encoding`);
                    break;
                }
            } catch (e) {
                console.log(`Failed to parse with ${encoding} encoding:`, e.message);
            }
        }

        if (!parsedRecords || parsedRecords.length === 0) {
            throw new Error('Failed to parse CSV file with any encoding');
        }

        const options = parsedRecords.map(row => ({
            '评价标准': row['评价标准'],
            '标签编码': row['标签编码']
        }));

        console.log('Parsed annotation options:', options);
        return options;
    } catch (error) {
        console.error('Error reading annotation options:', error);
        throw error;
    }
}

// 确保在 ipcMain.handle 中使用这个函数
ipcMain.handle('get-annotation-options', async (event, csvPath) => {
    return await getAnnotationOptions(csvPath);
});

async function getImages(folderPath) {
    try {
        const files = await fs.readdir(folderPath);
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
        const images = files.filter(file => 
            imageExtensions.includes(path.extname(file).toLowerCase())
        ).map(file => ({
            name: file,
            path: `file://${path.join(folderPath, file)}`
        }));
        console.log('Loaded images:', images);
        return images;
    } catch (error) {
        console.error('Error reading images:', error);
        throw error;
    }
}

ipcMain.handle('get-images', async (event, folderPath) => {
    return await getImages(folderPath);
});