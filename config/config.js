/**
 * Configuration module for the Office Seating Plan application
 * Environment-specific settings should be set here
 */
const AppConfig = {
    // API settings
    api: {
        baseUrl: 'https://localhost:44317/api',
        timeout: 30000, // 30 seconds
    },
    
    // Authentication settings
    auth: {
        useMockAuth: true, // Set to false for production with real Entra ID
        mockCredentials: {
            email: 'admin@example.com',
            password: 'Admin@123'
        },
        tokenStorageKey: 'auth_token',
        userStorageKey: 'auth_user',
    },
    
    // Feature flags
    features: {
        useMockData: false, // Set to false to use real API data
        enable3dView: true,
        enablePanoramaView: true,
        enableDepartmentZones: true,
    },
    
    // UI settings
    ui: {
        defaultMode: '2d', // '2d', '3d', or '360'
        gridSize: 5, // Grid size for snapping (in pixels)
        snapThreshold: 5, // Radius in pixels for endpoint snapping
        showStatusMessages: true,
        statusMessageDuration: 3000, // in milliseconds
    },
    
    // Default object dimensions
    defaults: {
        desk: {
            width: 160,
            height: 75,
            depth: 80,
            color: '#8B4513'
        },
        chair: {
            width: 50,
            height: 45,
            depth: 50,
            color: '#4169E1'
        },
        wall: {
            height: 250,
            thickness: 10,
            color: '#414141'
        }
    },
    
    // Paths for static resources
    paths: {
        defaultUserImage: 'images/default-user.png',
    },
    
    // Load configuration from environment or localStorage if available
    load() {
        try {
            // Check if we have saved configuration in localStorage
            const savedConfig = localStorage.getItem('app_config');
            if (savedConfig) {
                // Merge saved config with defaults
                const parsedConfig = JSON.parse(savedConfig);
                Object.keys(parsedConfig).forEach(key => {
                    if (typeof this[key] === 'object' && this[key] !== null) {
                        this[key] = { ...this[key], ...parsedConfig[key] };
                    } else {
                        this[key] = parsedConfig[key];
                    }
                });
            }
            
            // Add development flag based on hostname
            this.isDevelopment = window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1';
            
            // Auto-detect if we're using mock auth in development
            if (this.isDevelopment && typeof this.auth.useMockAuth === 'undefined') {
                this.auth.useMockAuth = true;
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
            // Continue with default config
        }
        
        return this;
    },
    
    // Save configuration to localStorage
    save() {
        try {
            // Create a copy without functions
            const configToSave = {};
            Object.keys(this).forEach(key => {
                if (typeof this[key] !== 'function') {
                    configToSave[key] = this[key];
                }
            });
            
            localStorage.setItem('app_config', JSON.stringify(configToSave));
            return true;
        } catch (error) {
            console.error('Error saving configuration:', error);
            return false;
        }
    }
};

// Export as singleton
export default AppConfig.load();