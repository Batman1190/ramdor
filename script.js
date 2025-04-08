// Add interactivity and video loading logic here
document.addEventListener('DOMContentLoaded', async () => {
    // Authentication handling
    const loginBtn = document.querySelector('.login-btn');
    const uploadBtn = document.querySelector('.upload-btn');
    let currentUser = null; // Add this to track user state
    
    try {
        // Check if user is logged in
        const { data, error } = await window.supabaseClient.auth.getSession();
        currentUser = data?.session?.user;

        if (currentUser) {
            loginBtn.textContent = 'Sign Out';
            uploadBtn.style.display = 'block';
        } else {
            loginBtn.textContent = 'Sign In';
            uploadBtn.style.display = 'none';
            uploadBtn.addEventListener('click', () => {
                alert('Please sign in to upload videos');
            });
        }
    } catch (err) {
        console.error('Error checking auth status:', err);
    }

    // Update login handler to use currentUser
    // Login/Logout handling
    loginBtn.addEventListener('click', async () => {
        try {
            console.log('Login button clicked');
            if (!window.supabaseClient) {
                console.error('Supabase not initialized');
                return;
            }
            
            if (currentUser) {
                console.log('Signing out...');
                await window.supabaseClient.auth.signOut();
                window.location.reload();
            } else {
                console.log('Starting Google sign in...');
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
                
                console.log('Immediate response:', { data, error });
            }
        } catch (err) {
            console.error('Login error:', err);
            alert('Login error: ' + err.message);
        }
    });

    // Upload handling
    uploadBtn.addEventListener('click', async () => {
        if (!currentUser) {
            alert('Please sign in to upload videos');
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            console.log('Starting upload for:', file.name);
            const fileName = `${Date.now()}-${file.name}`;
            
            try {
                console.log('Uploading to storage...');
                // Upload to Supabase Storage with correct bucket name
                const { data, error } = await window.supabaseClient.storage
                    .from('public-videos') // Change bucket name to match your Supabase storage bucket
                    .upload(`${currentUser.id}/${fileName}`, file, {
                        upsert: false
                    });
                    
                if (error) {
                    console.error('Storage upload error:', error);
                    alert(`Error uploading video: ${error.message}`);
                    return;
                }

                console.log('Storage upload successful, saving to database...');
                // Use user_id instead of owner_id
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
                    alert(`Error saving video metadata: ${dbError.message}`);
                    return;
                }
        
                alert('Video uploaded successfully!');
                loadVideos();
            } catch (err) {
                console.error('Upload error:', err);
                alert(`Upload error: ${err.message}`);
            }
        };
        
        input.click();
    });

    // Load videos from Supabase
    async function loadVideos() {
        const { data: videos, error } = await window.supabaseClient
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading videos:', error);
            return;
        }

        const videoGrid = document.querySelector('.video-grid');
        videoGrid.innerHTML = '';

        for (const video of videos) {
            // Fix URL construction for Supabase storage with correct bucket
            const { data } = window.supabaseClient.storage
                .from('public-videos') // Change bucket name to match your Supabase storage bucket
                .getPublicUrl(video.url);

            // Debug URL construction
            console.log('Video data:', {
                url: video.url,
                publicUrl: data.publicUrl,
                title: video.title
            });

            const card = document.createElement('div');
            card.className = 'video-card';
            card.innerHTML = `
                <video controls>
                    <source src="${data.publicUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <div class="video-info">
                    <h3>${video.title}</h3>
                    <p>${video.user_id}</p>
                    <p>${video.views || 0} views • ${new Date(video.created_at).toLocaleDateString()}</p>
                </div>
            `;

            videoGrid.appendChild(card);
        }
    }

    // Remove all duplicate code below this point
    function createVideoCard(video) {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <video controls>
                <source src="${video.videoUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
            <div class="video-info">
                <h3>${video.title}</h3>
                <p>${video.author}</p>
                <p>${video.views} • ${video.timestamp}</p>
            </div>
        `;

        // Debug video element
        const videoElement = card.querySelector('video');
        videoElement.addEventListener('error', (e) => {
            console.error('Video loading error:', e);
        });

        return card;
    }

    // Initial video load
    loadVideos();

    // Delete everything below this line until the viewToggle code
    // Remove these sections as they're duplicating video grid population
    // Sample video data
    const videos = [
        {
            thumbnail: 'video1.jpg',
            title: 'Amazing Adventure in Nature',
            author: 'Nature Explorer',
            views: '1.2M views',
            timestamp: '2 days ago'
        },
        // Add more video objects here
    ];

    // Function to create video cards (keep this)
    function createVideoCard(video) {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <video src="${video.thumbnail}" controls>
                <source src="${video.thumbnail}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
            <div class="video-info">
                <h3>${video.title}</h3>
                <p>${video.author}</p>
                <p>${video.views} • ${video.timestamp}</p>
            </div>
        `;
        return card;
    }

    // Remove this section as it's duplicate
    // const videoGrid = document.querySelector('.video-grid');
    // videos.forEach(video => {
    //     videoGrid.appendChild(createVideoCard(video));
    // });

    // Toggle between grid and feed view
    const viewToggle = document.createElement('button');
    viewToggle.id = 'view-toggle';
    viewToggle.innerHTML = '<i class="fas fa-toggle-on"></i>';
    document.querySelector('.nav-right').prepend(viewToggle);

    viewToggle.addEventListener('click', () => {
        const videoGrid = document.querySelector('.video-grid');
        const tiktokFeed = document.querySelector('.tiktok-style-feed');
        
        if (videoGrid.style.display !== 'none') {
            videoGrid.style.display = 'none';
            tiktokFeed.style.display = 'block';
        } else {
            videoGrid.style.display = 'grid';
            tiktokFeed.style.display = 'none';
        }
    });
});