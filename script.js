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
    // Authentication handling
    const loginBtn = document.querySelector('.login-btn');
    const uploadBtn = document.querySelector('.upload-btn');
    let currentUser = null;
    
    try {
        // Check if user is logged in
        const { data, error } = await window.supabaseClient.auth.getSession();
        currentUser = data?.session?.user;

        // If no session but we have stored user data, try to restore the session
        if (!currentUser) {
            const storedUser = localStorage.getItem('ramdor_user');
            if (storedUser) {
                currentUser = JSON.parse(storedUser);
            }
        }

        if (currentUser) {
            // Update login button and upload button
            loginBtn.textContent = 'Sign Out';
            uploadBtn.style.display = 'block';

            // Update user profile display
            const userNameElement = document.querySelector('.user-name');
            const profilePicElement = document.querySelector('.profile-pic');

            if (userNameElement) {
                const displayName = currentUser.user_metadata?.full_name || 
                                  currentUser.user_metadata?.name ||
                                  currentUser.email?.split('@')[0] ||
                                  'User';
                userNameElement.textContent = displayName;
                userNameElement.style.display = 'block';
            }

            if (profilePicElement) {
                const avatarUrl = currentUser.user_metadata?.avatar_url ||
                                currentUser.user_metadata?.picture;
                if (avatarUrl) {
                    profilePicElement.src = avatarUrl;
                    profilePicElement.style.display = 'block';
                }
            }
        } else {
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
                        views: 0
                    }])
                    .select();
        
                if (dbError) {
                    console.error('Database error:', dbError);
                    showError(`Error saving video metadata: ${dbError.message}`);
                    return;
                }
        
                showError('Video uploaded successfully!');
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
            let query = window.supabaseClient
                .from('videos')
                .select('*');

            // Apply sorting
            if (sortBy === 'views') {
                query = query.order('views', { ascending: false });
            } else {
                query = query.order('created_at', { ascending: false });
            }

            const { data: videos, error } = await query;

            if (error) {
                console.error('Error loading videos:', error);
                showError('Error loading videos');
                return [];
            }

            return videos;
        } catch (err) {
            console.error('Error in loadVideos:', err);
            showError('Error loading videos');
            return [];
        } finally {
            showLoading(false);
        }
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

        for (const video of videos) {
            try {
                const { data } = window.supabaseClient.storage
                    .from('videos')
                    .getPublicUrl(video.url);

                const card = document.createElement('div');
                card.className = 'video-card';
                
                // Add buttons if user owns the video
                const userControls = currentUser && currentUser.id === video.user_id ? `
                    <div class="video-controls">
                        <button class="edit-btn" title="Edit video">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="download-btn" title="Download video">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="delete-btn" title="Delete video">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                ` : '';

                card.innerHTML = `
                    <div class="video-header">
                        ${userControls}
                    </div>
                    <video controls width="100%" height="auto" preload="metadata">
                        <source src="${data.publicUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                    <div class="video-info">
                        <h3>${video.title}</h3>
                        <p>${video.user_id}</p>
                        <p><span class="view-count">${video.views || 0}</span> views • ${new Date(video.created_at).toLocaleDateString()}</p>
                    </div>
                `;

                // Add edit functionality
                const editBtn = card.querySelector('.edit-btn');
                if (editBtn) {
                    editBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        const modal = showModal(`
                            <div class="modal-content">
                                <h2>Edit Video</h2>
                                <form id="edit-form">
                                    <input type="text" id="video-title" value="${video.title}" placeholder="Video title">
                                    <textarea id="video-description" placeholder="Video description">${video.description || ''}</textarea>
                                    <div class="modal-buttons">
                                        <button type="submit">Save</button>
                                        <button type="button" class="cancel">Cancel</button>
                                    </div>
                                </form>
                            </div>
                        `);

                        const form = modal.querySelector('#edit-form');
                        form.addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const newTitle = form.querySelector('#video-title').value;
                            const newDescription = form.querySelector('#video-description').value;

                            try {
                                showLoading(true);
                                const { error: updateError } = await window.supabaseClient
                                    .from('videos')
                                    .update({ 
                                        title: newTitle,
                                        description: newDescription
                                    })
                                    .eq('id', video.id);

                                if (updateError) throw updateError;

                                // Update the card
                                card.querySelector('h3').textContent = newTitle;
                                modal.remove();
                                showError('Video updated successfully');
                            } catch (err) {
                                console.error('Error updating video:', err);
                                showError('Error updating video: ' + err.message);
                            } finally {
                                showLoading(false);
                            }
                        });

                        modal.querySelector('.cancel').addEventListener('click', () => modal.remove());
                    });
                }

                // Add download functionality
                const downloadBtn = card.querySelector('.download-btn');
                if (downloadBtn) {
                    downloadBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        try {
                            showLoading(true);
                            const response = await fetch(data.publicUrl);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = video.title;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                        } catch (err) {
                            console.error('Error downloading video:', err);
                            showError('Error downloading video: ' + err.message);
                        } finally {
                            showLoading(false);
                        }
                    });
                }

                // Add delete functionality
                const deleteBtn = card.querySelector('.delete-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        if (confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
                            try {
                                showLoading(true);
                                
                                // Delete from storage first
                                const { error: storageError } = await window.supabaseClient.storage
                                    .from('videos')
                                    .remove([video.url]);

                                if (storageError) throw storageError;

                                // Then delete from database
                                const { error: dbError } = await window.supabaseClient
                                    .from('videos')
                                    .delete()
                                    .eq('id', video.id);

                                if (dbError) throw dbError;

                                // Remove the card from UI
                                card.remove();
                                showError('Video deleted successfully');
                            } catch (err) {
                                console.error('Error deleting video:', err);
                                showError('Error deleting video: ' + err.message);
                            } finally {
                                showLoading(false);
                            }
                        }
                    });
                }

                // Add view count tracking
                const videoElement = card.querySelector('video');
                let viewCounted = false;

                videoElement.addEventListener('play', async () => {
                    if (!viewCounted) {
                        viewCounted = true;
                        try {
                            // Update view count in the database
                            const { data: updateData, error: updateError } = await window.supabaseClient
                                .from('videos')
                                .update({ views: (video.views || 0) + 1 })
                                .eq('id', video.id);

                            if (updateError) {
                                console.error('Error updating view count:', updateError);
                            } else {
                                // Update the view count in the UI
                                const viewCountElement = card.querySelector('.view-count');
                                viewCountElement.textContent = (video.views || 0) + 1;
                                video.views = (video.views || 0) + 1;
                            }
                        } catch (err) {
                            console.error('Error tracking view:', err);
                        }
                    }
                });

                videoElement.addEventListener('error', (e) => {
                    console.error('Video loading error:', e.target.error);
                    card.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>Error loading video</p>
                        </div>
                    `;
                });

                videoGrid.appendChild(card);
            } catch (err) {
                console.error('Error displaying video:', err);
            }
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
                .select('*');
            
            if (error) throw error;
            
            // Shuffle the videos
            const shuffledVideos = videos.sort(() => Math.random() - 0.5);
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
                .gte('created_at', sevenDaysAgo.toISOString())
                .order('views', { ascending: false })
                .limit(20);
            
            if (error) throw error;
            await displayVideos(videos);
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
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            await displayVideos(videos);
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
});