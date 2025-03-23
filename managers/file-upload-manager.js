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
        
        // 360° image upload button
        const panoramaUploadBtn = document.getElementById('upload-panorama');
        if (panoramaUploadBtn) {
            panoramaUploadBtn.addEventListener('click', () => this.upload360Image());
        }
        
        // Remove SVG background button
        const removeSvgBgBtn = document.getElementById('remove-svg-bg');
        if (removeSvgBgBtn) {
            removeSvgBgBtn.addEventListener('click', () => this.removeSvgBackground());
        }
    }
    
    async uploadSvgFloorPlan() {
        // Create a file input element for selecting SVG files
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.svg,image/svg+xml';
        
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                
                try {
                    // Show loading indicator
                    this.app.showLoading('Uploading floor plan...');
                    
                    // Get the current layout ID if available
                    const layoutId = this.app.locationManager?.selectedFloor?.id || 0;
                    
                    // If connected to a server, upload the file
                    if (this.app.serverData && !this.app.config.useMockData) {
                        // Create form data
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('layoutId', layoutId);
                        formData.append('description', 'Floor plan SVG');
                        
                        // Get the API URL
                        const apiUrl = `${this.app.config.apiUrl}/FileUpload/svg`;
                        
                        // Get auth token
                        const token = await this.app.authService.getAccessToken();
                        
                        // Upload the file
                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            body: formData,
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Server error: ${response.status} - ${errorText}`);
                        }
                        
                        const data = await response.json();
                        
                        // Use the returned URL as the SVG source
                        this.loadSvgFromUrl(data.url);
                    } else {
                        // For development, just read the file locally
                        const svgData = await this.readFileAsText(file);
                        this.loadSvgFromData(svgData);
                        
                        // Save to localStorage for persistence
                        this.saveSvgBackground(svgData);
                    }
                    
                    // Update preview if available
                    this.updateSvgPreview(file);
                    
                    this.app.hideLoading();
                    this.app.showSuccess('Floor plan uploaded successfully');
                } catch (error) {
                    console.error('Error uploading SVG:', error);
                    this.app.hideLoading();
                    this.app.showError('Failed to upload floor plan: ' + error.message);
                }
            }
        });
        
        // Trigger file selection dialog
        fileInput.click();
    }
    
    async upload360Image() {
        // Create a file input element for selecting image files
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                
                try {
                    // Show loading indicator
                    this.app.showLoading('Uploading 360° image...');
                    
                    // Get the current layout ID if available
                    const layoutId = this.app.locationManager?.selectedFloor?.id || 0;
                    
                    // If connected to a server, upload the file
                    if (this.app.serverData && !this.app.config.useMockData) {
                        // Create form data
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('layoutId', layoutId);
                        formData.append('description', '360° panorama image');
                        
                        // Get the API URL
                        const apiUrl = `${this.app.config.apiUrl}/FileUpload/panorama`;
                        
                        // Get auth token
                        const token = await this.app.authService.getAccessToken();
                        
                        // Upload the file
                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            body: formData,
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Server error: ${response.status} - ${errorText}`);
                        }
                        
                        const data = await response.json();
                        
                        // Use the returned URL in the panorama viewer
                        if (this.app.panoramaViewer) {
                            this.app.panoramaViewer.loadPanorama(data.url);
                            this.app.setActiveMode('360');
                        }
                    } else {
                        // For development, just create an object URL
                        const objectUrl = URL.createObjectURL(file);
                        
                        // Load the panorama
                        if (this.app.panoramaViewer) {
                            this.app.panoramaViewer.loadPanorama(objectUrl);
                            this.app.setActiveMode('360');
                        }
                    }
                    
                    this.app.hideLoading();
                    this.app.showSuccess('360° image uploaded successfully');
                } catch (error) {
                    console.error('Error uploading 360° image:', error);
                    this.app.hideLoading();
                    this.app.showError('Failed to upload 360° image: ' + error.message);
                }
            }
        });
        
        // Trigger file selection dialog
        fileInput.click();
    }
    
    loadSvgFromUrl(url) {
        if (!this.app.canvas2d) {
            console.error('Canvas not initialized');
            return;
        }
        
        // Remove any existing background
        if (this.app.svgBackground) {
            this.app.canvas2d.remove(this.app.svgBackground);
        }
        
        // Load the SVG from URL
        fabric.loadSVGFromURL(url, (objects, options) => {
            // Group the parsed SVG elements together
            const svgGroup = fabric.util.groupSVGElements(objects, options);
            
            // Set properties on the group
            svgGroup.set({
                selectable: false,
                evented: false,
                opacity: 0.8
            });
            
            // Store reference and add to canvas
            this.app.svgBackground = svgGroup;
            this.app.canvas2d.add(svgGroup);
            this.app.canvas2d.sendToBack(svgGroup);
            this.app.canvas2d.renderAll();
        });
    }
    
    loadSvgFromData(svgData) {
        if (!this.app.canvas2d) {
            console.error('Canvas not initialized');
            return;
        }
        
        // Remove any existing background
        if (this.app.svgBackground) {
            this.app.canvas2d.remove(this.app.svgBackground);
        }
        
        // Load the SVG from string data
        fabric.loadSVGFromString(svgData, (objects, options) => {
            // Group the parsed SVG elements together
            const svgGroup = fabric.util.groupSVGElements(objects, options);
            
            // Set properties on the group
            svgGroup.set({
                selectable: false,
                evented: false,
                opacity: 0.8
            });
            
            // Store reference and add to canvas
            this.app.svgBackground = svgGroup;
            this.app.canvas2d.add(svgGroup);
            this.app.canvas2d.sendToBack(svgGroup);
            this.app.canvas2d.renderAll();
        });
    }
    
    updateSvgPreview(file) {
        const previewImg = document.getElementById('svg-bg-preview');
        if (previewImg) {
            // Create object URL for preview
            const objectUrl = URL.createObjectURL(file);
            previewImg.src = objectUrl;
            previewImg.classList.add('active');
        }
    }
    
    removeSvgBackground() {
        // Remove from canvas
        if (this.app.svgBackground && this.app.canvas2d) {
            this.app.canvas2d.remove(this.app.svgBackground);
            this.app.svgBackground = null;
            this.app.canvas2d.renderAll();
        }
        
        // Remove from localStorage
        localStorage.removeItem('layoutSvgBackground');
        
        // Hide preview
        const previewImg = document.getElementById('svg-bg-preview');
        if (previewImg) {
            previewImg.src = '';
            previewImg.classList.remove('active');
        }
        
        this.app.showInfo('SVG background removed');
    }
    
    saveSvgBackground(svgData) {
        try {
            localStorage.setItem('layoutSvgBackground', svgData);
            return true;
        } catch (error) {
            console.error('Failed to save SVG background:', error);
            return false;
        }
    }
    
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
}