import React from 'react';

export const ProfilesSection: React.FC = () => {
  return (
    <div id="profiles" className="section">
      <h1 data-i18n="sidebar.installations">Installations</h1>
      <div className="profiles-section">
        <button id="createProfileBtn" className="create-profile-btn">
          <i className="fas fa-plus"></i> <span data-i18n="installations.create_new">Crear</span>
        </button>
        <div id="profilesList">
          {/* Profiles will be loaded here dynamically */}
        </div>
      </div>
    </div>
  );
};

export default ProfilesSection;
