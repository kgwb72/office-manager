class FileUploadManager {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // SVG upload for floor plans
        const svgUploadBtn = document.getElementById('upload-svg-bg');
        if (svgUploadBtn) {
            svgUploadBtn.addEventListener('click', () => this.uploadSvgFloorPlan());
        }
        
        // 360° image upload button - add this to your HTML
        const panoramaUploadBtn = document.getElementById('upload-panorama');
        if (panoramaUploadBtn) {
            panoramaUploadBtn.addEventListener('click', () => this.upload360Image());
        }
    }
    
    uploadSvgFloorPlan() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.svg';
        
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                
                try {
                    this.showLoader('Uploading floor plan...');
                    
                    // If connected to a server, you'd upload the file
                    // For now we'll just read it locally
                    const svgData = await this.readFileAsText(file);
                    
                    // Save and display the SVG background
                    this.app.saveSvgBackground(svgData);
                    this.app.loadSvgBackground();
                    
                    // Update preview if available
                    const previewImg = document.getElementById('svg-bg-preview');
                    if (previewImg) {
                        // Create object URL for preview
                        const objectUrl = URL.createObjectURL(file);
                        previewImg.src = objectUrl;
                        previewImg.style.display = 'block';
                    }
                    
                    this.hideLoader();
                } catch (error) {
                    console.error('Error uploading SVG:', error);
                    this.hideLoader();
                    alert('Failed to upload floor plan: ' + error.message);
                }
            }
        });
        
        fileInput.click();
    }
    
    upload360Image() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                
                try {
                    this.showLoader('Uploading 360° image...');
                    
                    // If connected to a server, you'd upload the file
                    // For now we'll just create an object URL
                    const objectUrl = URL.createObjectURL(file);
                    
                    // Load the panorama if viewer exists
                    if (this.app.panoramaViewer) {
                        this.app.panoramaViewer.loadPanorama(objectUrl);
                        this.app.panoramaViewer.show();
                    } else {
                        alert('Panorama viewer not initialized');
                    }
                    
                    this.hideLoader();
                } catch (error) {
                    console.error('Error uploading 360° image:', error);
                    this.hideLoader();
                    alert('Failed to upload 360° image: ' + error.message);
                }
            }
        });
        
        fileInput.click();
    }
    
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
    
    showLoader(message = 'Loading...') {
        let loader = document.getElementById('loader-container');
        
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'loader-container';
            loader.className = 'loading-indicator-container';
            loader.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            `;
            document.body.appendChild(loader);
        } else {
            document.querySelector('#loader-container .loading-message').textContent = message;
            loader.style.display = 'flex';
        }
    }
    
    hideLoader() {
        const loader = document.getElementById('loader-container');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}