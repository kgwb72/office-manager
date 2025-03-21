class PanoramaViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with ID ${containerId} not found`);
        }
        
        this.viewer = null;
        this.hotspots = [];
        
        this.initialize();
    }
    
    initialize() {
        // Create viewer
        this.viewer = new PhotoSphereViewer.Viewer({
            container: this.container,
            panorama: '', // Will be set when loading an image
            navbar: [
                'autorotate', 'zoom', 'move', 'fullscreen'
            ],
            plugins: [
                [PhotoSphereViewer.MarkersPlugin, {
                    markers: []
                }]
            ]
        });
        
        // Get markers plugin
        this.markersPlugin = this.viewer.getPlugin(PhotoSphereViewer.MarkersPlugin);
        
        // Hide the viewer initially
        this.hide();
    }
    
    loadPanorama(imageUrl, hotspots = []) {
        this.viewer.setPanorama(imageUrl).then(() => {
            // Clear existing hotspots
            this.markersPlugin.clearMarkers();
            
            // Add new hotspots
            hotspots.forEach(hotspot => {
                this.addHotspot(hotspot);
            });
        });
    }
    
    addHotspot(hotspot) {
        const marker = {
            id: hotspot.id,
            longitude: hotspot.longitude,
            latitude: hotspot.latitude,
            html: `<div class="panorama-hotspot" title="${hotspot.title}"></div>`,
            tooltip: {
                content: hotspot.title || 'Desk'
            },
            data: hotspot
        };
        
        this.markersPlugin.addMarker(marker);
        
        // Add click event
        this.markersPlugin.on('select-marker', (e, marker) => {
            // Handle hotspot click
            if (hotspot.onClick) {
                hotspot.onClick(marker.data);
            }
        });
    }
    
    show() {
        this.container.style.display = 'block';
        this.viewer.refresh();
    }
    
    hide() {
        this.container.style.display = 'none';
    }
    
    destroy() {
        if (this.viewer) {
            this.viewer.destroy();
            this.viewer = null;
        }
    }
}