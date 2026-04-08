public class AppBootstrap {
    public void init() {
        initializeCache();
        loadUserPreferences();
        setupRoutes();
        connectDatabase();
    }
}
