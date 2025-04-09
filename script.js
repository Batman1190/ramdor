// Utility functions
const showLoading = (show) => {
    const spinner = document.querySelector('.upload-spinner') || 
                   document.createElement('div');
    spinner.className = 'upload-spinner';
    if (show) {
        spinner.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(spinner);
    } else {
        spinner.remove();
    }
};

const showError = (message) => {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
    `;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
};

const showModal = (content) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = content;
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    return modal;
};

// Main application code
document.addEventListener('DOMContentLoaded', async () => {
    // Clear any existing content in the video grid immediately
    const videoGrid = document.querySelector('.video-grid');
    if (videoGrid) {
        videoGrid.innerHTML = `
            <div class="loading-placeholder">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading videos...</p>
            </div>
        `;
    }

    // Add styles for loading and placeholders
    const style = document.createElement('style');
    style.textContent = `
        .loading-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 200px;
            color: var(--text-color);
            gap: 1rem;
        }
        .loading-placeholder i {
            font-size: 2rem;
        }
        .video-grid {
            min-height: 200px;
        }
        .video-card {
            opacity: 0;
            animation: fadeIn 0.3s ease-in forwards;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        /* Updated description styles */
        .description-container {
            margin: 10px 0;
            padding: 10px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
            max-height: none;
            overflow: visible;
        }

        .video-description {
            color: #ccc;
            font-size: 0.9em;
            line-height: 1.5;
            white-space: pre-wrap;
            word-break: break-word;
            margin: 0;
            max-height: none;
            overflow: visible;
        }

        .video-info {
            padding: 15px;
        }

        .video-info h3 {
            margin: 0 0 10px 0;
            font-size: 1.1em;
            color: #fff;
        }

        .char-counter {
            text-align: right;
            font-size: 0.8em;
            color: #666;
            margin-top: 4px;
        }
        
        #video-description {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            resize: vertical;
            min-height: 100px;
        }
    `;
    document.head.appendChild(style);

    // Authentication handling
    const loginBtn = document.querySelector('.login-btn');
    const uploadBtn = document.querySelector('.upload-btn');
    let currentUser = null;
    
    try {
        // Check if user is logged in
        console.log('Checking auth status...');
        const { data, error } = await window.supabaseClient.auth.getSession();
        currentUser = data?.session?.user;
        console.log('Session data:', data);

        // If no session but we have stored user data, try to restore the session
        if (!currentUser) {
            console.log('No active session, checking localStorage...');
            const storedUser = localStorage.getItem('ramdor_user');
            if (storedUser) {
                console.log('Found stored user data');
                currentUser = JSON.parse(storedUser);
                console.log('Current user:', currentUser);
            }
        }

        if (currentUser) {
            console.log('User is logged in:', currentUser);
            // Update login button and upload button
            loginBtn.textContent = 'Sign Out';
            uploadBtn.style.display = 'block';

            // Update user profile display
            const userNameElement = document.querySelector('.user-name');
            const profilePicElement = document.querySelector('.profile-pic');

            console.log('User metadata:', currentUser.user_metadata);
            if (userNameElement) {
                const displayName = currentUser.user_metadata?.full_name || 
                                  currentUser.user_metadata?.name ||
                                  currentUser.email?.split('@')[0] ||
                                  'User';
                console.log('Setting display name:', displayName);
                userNameElement.textContent = displayName;
                userNameElement.style.display = 'block';
            } else {
                console.log('User name element not found');
            }

            if (profilePicElement) {
                const avatarUrl = currentUser.user_metadata?.avatar_url ||
                                currentUser.user_metadata?.picture;
                console.log('Avatar URL:', avatarUrl);
                if (avatarUrl) {
                    profilePicElement.src = avatarUrl;
                    profilePicElement.style.display = 'block';
                }
            } else {
                console.log('Profile pic element not found');
            }
        } else {
            console.log('User is not logged in');
            loginBtn.textContent = 'Sign In';
            uploadBtn.style.display = 'none';

            // Hide user profile elements
            const userNameElement = document.querySelector('.user-name');
            const profilePicElement = document.querySelector('.profile-pic');
            
            if (userNameElement) userNameElement.style.display = 'none';
            if (profilePicElement) profilePicElement.style.display = 'none';
            
            // Clear stored user data
            localStorage.removeItem('ramdor_user');
        }
    } catch (err) {
        console.error('Error checking auth status:', err);
        showError('Error checking authentication status');
    }

    // Login/Logout handling
    loginBtn.addEventListener('click', async () => {
        try {
            if (!window.supabaseClient) {
                console.error('Supabase not initialized');
                showError('Authentication service not available');
                return;
            }
            
            if (currentUser) {
                console.log('Signing out...');
                showLoading(true);
                await window.supabaseClient.auth.signOut();
                localStorage.removeItem('ramdor_user');
                window.location.reload();
            } else {
                const useGoogle = confirm('This app uses Google Sign In. If you don\'t have a Google account, you can create one with your existing email address. Would you like to continue?');
                
                if (useGoogle) {
                    console.log('Starting Google sign in...');
                    showLoading(true);
                    const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                            redirectTo: 'https://batman1190.github.io/ramdor/callback.html',
                            queryParams: {
                                access_type: 'offline',
                                prompt: 'consent'
                            }
                        }
                    });
                    if (error) throw error;
                }
            }
        } catch (err) {
            console.error('Login error:', err);
            showError(`Login error: ${err.message}`);
        } finally {
            showLoading(false);
        }
    });

    // Upload handling
    uploadBtn.addEventListener('click', async () => {
        if (!currentUser) {
            showError('Please sign in to upload videos');
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            // Validate file size (max 100MB)
            const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
            if (file.size > MAX_FILE_SIZE) {
                showError('File size exceeds 100MB limit');
                return;
            }

            // Validate file type
            const validTypes = ['video/mp4', 'video/webm', 'video/ogg'];
            if (!validTypes.includes(file.type)) {
                showError('Please upload a valid video file (MP4, WebM, or OGG)');
                return;
            }

            console.log('Starting upload for:', file.name);
            const fileName = `${Date.now()}-${file.name}`;
            
            try {
                showLoading(true);
                console.log('Uploading to storage...');
                // Upload to Supabase Storage
                const { data, error } = await window.supabaseClient.storage
                    .from('videos')
                    .upload(`${currentUser.id}/${fileName}`, file, {
                        upsert: false
                    });

                if (error) {
                    console.error('Storage upload error:', error);
                    showError(`Error uploading video: ${error.message}`);
                    return;
                }

                console.log('Storage upload successful, saving to database...');
                const { data: videoData, error: dbError } = await window.supabaseClient
                    .from('videos')
                    .insert([{
                        title: file.name,
                        url: `${currentUser.id}/${fileName}`,
                        user_id: currentUser.id,
                        views: 0,
                        description: '' // Initialize with empty description
                    }])
                    .select();
        
                if (dbError) {
                    console.error('Database error:', dbError);
                    showError(`Error saving video metadata: ${dbError.message}`);
                    return;
                }
        
                showError('Video uploaded successfully! You can now add a description by clicking the Edit Details button.');
                loadVideos();
            } catch (err) {
                console.error('Upload error:', err);
                showError(`Upload error: ${err.message}`);
            } finally {
                showLoading(false);
            }
        };
        
        input.click();
    });

    // Video loading functions
    async function loadVideos(sortBy = 'recent') {
        try {
            showLoading(true);
            
            // Clear the video grid first
            const videoGrid = document.querySelector('.video-grid');
            videoGrid.innerHTML = `
                <div class="loading-placeholder">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading videos...</p>
                </div>
            `;

            // Get all videos with their current view counts
            const { data: videos, error } = await window.supabaseClient
                .from('videos')
                .select('id, title, url, user_id, views, description, created_at')
                .not('user_id', 'is', null)
                .lt('created_at', new Date().toISOString());

            if (error) {
                console.error('Error loading videos:', error);
                showError('Error loading videos');
                return [];
            }

            console.log('Loaded videos from database:', videos);

            // Check each video's existence and remove invalid ones
            const validVideos = [];
            const deletionPromises = [];

            for (const video of videos) {
                try {
                    console.log('Processing video:', { 
                        id: video.id, 
                        title: video.title, 
                        url: video.url 
                    });

                    // Try to get the file from storage
                    const { data } = window.supabaseClient.storage
                        .from('videos')
                        .getPublicUrl(video.url);

                    // Check if the file exists
                    try {
                        const response = await fetch(data.publicUrl, { method: 'HEAD' });
                        if (response.ok) {
                            validVideos.push(video);
                        } else {
                            console.log('Video file not accessible, queuing for deletion:', video.id);
                            // Queue the deletion
                            deletionPromises.push(
                                window.supabaseClient
                                    .from('videos')
                                    .delete()
                                    .eq('id', video.id)
                            );
                        }
                    } catch (fetchErr) {
                        console.log('Video file not accessible, queuing for deletion:', video.id);
                        // Queue the deletion
                        deletionPromises.push(
                            window.supabaseClient
                                .from('videos')
                                .delete()
                                .eq('id', video.id)
                        );
                    }
                } catch (err) {
                    console.log('Error checking video, queuing for deletion:', video.id);
                    // Queue the deletion
                    deletionPromises.push(
                        window.supabaseClient
                            .from('videos')
                            .delete()
                            .eq('id', video.id)
                    );
                }
            }

            // Execute all deletions in parallel
            if (deletionPromises.length > 0) {
                console.log(`Removing ${deletionPromises.length} invalid videos...`);
                await Promise.all(deletionPromises);
            }

            // Apply sorting to valid videos
            if (sortBy === 'views') {
                validVideos.sort((a, b) => (parseInt(b.views) || 0) - (parseInt(a.views) || 0));
            } else {
                validVideos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }

            return validVideos;
        } catch (err) {
            console.error('Error in loadVideos:', err);
            showError('Error loading videos');
            return [];
        } finally {
            showLoading(false);
        }
    }

    // Function to update view count
    async function incrementViewCount(video, viewCountElement) {
        try {
            // Get current views from database
            const { data: currentData, error: getError } = await window.supabaseClient
                .from('videos')
                .select('views')
                .eq('id', video.id)
                .single();

            if (getError) throw getError;

            // Calculate new view count
            const currentViews = parseInt(currentData.views || 0);
            const newViews = currentViews + 1;

            // Update view count in database
            const { data: updateData, error: updateError } = await window.supabaseClient
                .from('videos')
                .update({ views: newViews })
                .eq('id', video.id)
                .select()
                .single();

            if (updateError) throw updateError;

            // Update UI
            if (viewCountElement && updateData) {
                viewCountElement.textContent = updateData.views;
                video.views = updateData.views;
            }
        } catch (err) {
            console.error('Error updating view count:', err);
        }
    }

    // Modify the video event listener in displayVideos
    function addViewCountListener(videoElement, video, viewCountElement) {
        let viewCounted = false;
        videoElement.addEventListener('play', async () => {
            if (!viewCounted) {
                viewCounted = true;
                await incrementViewCount(video, viewCountElement);
            }
        });
    }

    async function displayVideos(videos) {
        const videoGrid = document.querySelector('.video-grid');
        videoGrid.innerHTML = '';

        if (!videos || videos.length === 0) {
            videoGrid.innerHTML = `
                <div class="no-videos">
                    <i class="fas fa-video-slash"></i>
                    <p>No videos found</p>
                </div>
            `;
            return;
        }

        // Array to store videos that need to be deleted
        const videosToDelete = [];

        for (const video of videos) {
            try {
                // Check if video URL exists and is accessible
                if (!video.url) {
                    console.log('Video has no URL, marking for deletion:', video.id);
                    videosToDelete.push(video.id);
                    continue;
                }

                // Try to get the public URL
                const { data } = window.supabaseClient.storage
                    .from('videos')
                    .getPublicUrl(video.url);

                // Check if the file is accessible
                try {
                    const response = await fetch(data.publicUrl, { method: 'HEAD' });
                    if (!response.ok) {
                        console.log('Video file not accessible, marking for deletion:', video.id);
                        videosToDelete.push(video.id);
                        continue;
                    }
                } catch (fetchErr) {
                    console.log('Error accessing video file, marking for deletion:', video.id);
                    videosToDelete.push(video.id);
                    continue;
                }

                // Only create and display card for valid videos
                const card = document.createElement('div');
                card.className = 'video-card';

                // Show controls only for signed-in users
                const userControls = `
                    <div class="video-controls">
                        ${currentUser ? `
                            ${currentUser.id === video.user_id ? `
                                <button class="edit-btn" title="Edit video" data-video-id="${video.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="delete-btn" title="Delete video" data-video-id="${video.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                            <button class="download-btn" title="Download video">
                                <i class="fas fa-download"></i>
                            </button>
                        ` : ''}
                    </div>
                `;

                card.innerHTML = `
                    <div class="video-header">
                        ${userControls}
                    </div>
                    <video controls width="100%" height="auto" preload="metadata">
                        <source src="${data.publicUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                    <div class="video-info">
                        <h3>${video.title || 'Untitled Entry'}</h3>
                        <div class="description-container">
                            <p class="video-description">${video.description || 'No description available'}</p>
                        </div>
                        <div class="video-metadata">
                            <p><span class="view-count">${video.views || 0}</span> views</p>
                            ${currentUser && currentUser.id === video.user_id ? `
                                <button class="edit-description-btn" title="Edit description">
                                    <i class="fas fa-edit"></i> Edit Details
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;

                // Add event listeners and functionality
                addCardEventListeners(card, video);
                videoGrid.appendChild(card);

            } catch (err) {
                console.error('Error displaying video:', err);
                videosToDelete.push(video.id);
            }
        }

        // Delete invalid videos
        if (videosToDelete.length > 0) {
            console.log('Deleting invalid videos:', videosToDelete);
            try {
                // Delete from database
                const { error: dbError } = await window.supabaseClient
                    .from('videos')
                    .delete()
                    .in('id', videosToDelete);

                if (dbError) {
                    console.error('Error deleting invalid videos:', dbError);
                } else {
                    console.log('Successfully deleted invalid videos');
                    // Reload the current section
                    const activeSection = document.querySelector('.sidebar-item.active span').textContent.toLowerCase();
                    switch (activeSection) {
                        case 'home':
                            await loadHomeVideos();
                            break;
                        case 'explore':
                            await loadExploreVideos();
                            break;
                        case 'trending':
                            await loadTrendingVideos();
                            break;
                        case 'library':
                            await loadLibraryVideos();
                            break;
                    }
                }
            } catch (err) {
                console.error('Error in bulk deletion:', err);
            }
        }
    }

    // Helper function to add event listeners to video cards
    function addCardEventListeners(card, video) {
        // Add edit functionality
        const editBtn = card.querySelector('.edit-btn, .edit-description-btn');
        if (editBtn && currentUser && currentUser.id === video.user_id) {
            editBtn.addEventListener('click', (e) => handleEditClick(e, card, video));
        }

        // Add delete functionality
        const deleteBtn = card.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => handleDeleteClick(e, card, video));
        }

        // Add download functionality
        const downloadBtn = card.querySelector('.download-btn');
        if (downloadBtn && currentUser) {
            downloadBtn.addEventListener('click', (e) => handleDownloadClick(e, video));
        }

        // Add view count tracking
        const videoElement = card.querySelector('video');
        if (videoElement) {
            let viewCounted = false;
            videoElement.addEventListener('play', () => {
                if (!viewCounted) {
                    handleViewCount(video, card);
                    viewCounted = true;
                }
            });
        }
    }

    async function loadHomeVideos() {
        const videos = await loadVideos('recent');
        await displayVideos(videos);
    }

    async function loadExploreVideos() {
        try {
            const { data: videos, error } = await window.supabaseClient
                .from('videos')
                .select('*')
                .not('user_id', 'is', null)
                .lt('created_at', new Date().toISOString());
            
            if (error) throw error;
            
            // Filter out invalid videos
            const validVideos = videos.filter(video => {
                const isTestVideo = video.title === 'Test Video 1' || video.title === 'Test Video 2';
                const hasNullUser = !video.user_id || video.user_id === 'null';
                const hasFutureDate = new Date(video.created_at) > new Date();
                
                return !isTestVideo && !hasNullUser && !hasFutureDate;
            });
            
            // Shuffle the valid videos
            const shuffledVideos = validVideos.sort(() => Math.random() - 0.5);
            await displayVideos(shuffledVideos);
        } catch (err) {
            console.error('Error loading explore videos:', err);
            showError('Error loading explore videos');
            await displayVideos([]);
        }
    }

    async function loadTrendingVideos() {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const { data: videos, error } = await window.supabaseClient
                .from('videos')
                .select('*')
                .not('user_id', 'is', null)
                .lt('created_at', new Date().toISOString())
                .gte('created_at', sevenDaysAgo.toISOString())
                .order('views', { ascending: false })
                .limit(20);
            
            if (error) throw error;

            // Filter out invalid videos
            const validVideos = videos.filter(video => {
                const isTestVideo = video.title === 'Test Video 1' || video.title === 'Test Video 2';
                const hasNullUser = !video.user_id || video.user_id === 'null';
                const hasFutureDate = new Date(video.created_at) > new Date();
                
                return !isTestVideo && !hasNullUser && !hasFutureDate;
            });

            await displayVideos(validVideos);
        } catch (err) {
            console.error('Error loading trending videos:', err);
            showError('Error loading trending videos');
            await displayVideos([]);
        }
    }

    async function loadLibraryVideos() {
        if (!currentUser) {
            showError('Please sign in to view your library');
            await displayVideos([]);
            return;
        }

        try {
            const { data: videos, error } = await window.supabaseClient
                .from('videos')
                .select('*')
                .eq('user_id', currentUser.id)
                .not('user_id', 'is', null)
                .lt('created_at', new Date().toISOString())
                .order('created_at', { ascending: false });
            
            if (error) throw error;

            // Filter out invalid videos
            const validVideos = videos.filter(video => {
                const isTestVideo = video.title === 'Test Video 1' || video.title === 'Test Video 2';
                const hasNullUser = !video.user_id || video.user_id === 'null';
                const hasFutureDate = new Date(video.created_at) > new Date();
                
                return !isTestVideo && !hasNullUser && !hasFutureDate;
            });

            await displayVideos(validVideos);
        } catch (err) {
            console.error('Error loading library videos:', err);
            showError('Error loading library videos');
            await displayVideos([]);
        }
    }

    // Sidebar navigation handling
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', async () => {
            // Remove active class from all items
            sidebarItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');

            // Show loading state
            showLoading(true);

            try {
                const itemText = item.querySelector('span').textContent.toLowerCase();

                switch (itemText) {
                    case 'home':
                        await loadHomeVideos();
                        break;
                    case 'explore':
                        await loadExploreVideos();
                        break;
                    case 'trending':
                        await loadTrendingVideos();
                        break;
                    case 'library':
                        await loadLibraryVideos();
                        break;
                }
            } catch (err) {
                console.error('Error handling navigation:', err);
                showError('Error loading content');
            } finally {
                showLoading(false);
            }
        });
    });

    // Initial load of home videos
    await loadHomeVideos();

    async function deleteVideo(videoId) {
        try {
            showLoading(true);
            
            // First, get the video details
            const { data: video, error: fetchError } = await window.supabaseClient
                .from('videos')
                .select('*')
                .eq('id', videoId)
                .single();

            if (fetchError) throw fetchError;

            // Delete from storage first
            if (video.url) {
                const { error: storageError } = await window.supabaseClient.storage
                    .from('videos')
                    .remove([video.url]);

                if (storageError) {
                    console.error('Storage delete error:', storageError);
                    // Continue even if storage delete fails
                }
            }

            // Then delete from database
            const { error: dbError } = await window.supabaseClient
                .from('videos')
                .delete()
                .eq('id', videoId);

            if (dbError) throw dbError;

            // Force a complete reload of the current section
            const activeSection = document.querySelector('.sidebar-item.active span').textContent.toLowerCase();
            switch (activeSection) {
                case 'home':
                    await loadHomeVideos();
                    break;
                case 'explore':
                    await loadExploreVideos();
                    break;
                case 'trending':
                    await loadTrendingVideos();
                    break;
                case 'library':
                    await loadLibraryVideos();
                    break;
            }

            showError('Video deleted successfully');
            return true;
        } catch (err) {
            console.error('Error deleting video:', err);
            showError(`Error deleting video: ${err.message}`);
            return false;
        } finally {
            showLoading(false);
        }
    }

    async function forceDeleteVideo(video) {
        try {
            showLoading(true);
            console.log('Attempting to force delete video:', video);
            
            // Delete from database first, without checking ownership
            const { error: dbError } = await window.supabaseClient
                .from('videos')
                .delete()
                .eq('id', video.id);

            if (dbError) {
                console.error('Database delete error:', dbError);
                // If the database delete fails, try a more aggressive approach
                try {
                    const { error: fallbackError } = await window.supabaseClient.rpc('force_delete_video', {
                        video_id: video.id
                    });
                    if (fallbackError) throw fallbackError;
                } catch (fallbackErr) {
                    console.error('Fallback delete error:', fallbackErr);
                    throw fallbackErr;
                }
            }

            // Try to delete from storage if URL exists
            if (video.url) {
                try {
                    await window.supabaseClient.storage
                        .from('videos')
                        .remove([video.url]);
                } catch (storageErr) {
                    console.error('Storage delete error:', storageErr);
                    // Continue even if storage delete fails
                }
            }

            showError('Video entry removed successfully');
            return true;
        } catch (err) {
            console.error('Error removing video entry:', err);
            showError(`Error removing video entry: ${err.message}`);
            return false;
        } finally {
            showLoading(false);
        }
    }

    // Add a function to clean up invalid entries
    async function cleanupInvalidEntries() {
        try {
            const { data: videos, error } = await window.supabaseClient
                .from('videos')
                .select('*')
                .eq('title', 'Test Video 1')
                .or('title.eq.Test Video 2');

            if (error) throw error;

            if (videos && videos.length > 0) {
                for (const video of videos) {
                    await forceDeleteVideo(video);
                }
                showError('Successfully cleaned up test videos');
                await loadHomeVideos(); // Refresh the video list
            }
        } catch (err) {
            console.error('Error cleaning up test videos:', err);
            showError('Error cleaning up test videos');
        }
    }

    // Call cleanup on page load
    cleanupInvalidEntries();
});