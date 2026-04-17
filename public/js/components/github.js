let activePushPid = null;
window.showGithubModal = async function showGithubModal(pid) {
            activePushPid = pid;
            document.getElementById('github-push-modal').style.display = 'flex';
            
            // Populate cached values
            document.getElementById('github-user').value = localStorage.getItem('gh_username') || '';
            document.getElementById('github-token').value = localStorage.getItem('gh_token') || '';
            document.getElementById('github-repo').value = ''; // Clean start for repo name
            document.getElementById('github-repo').focus();
        };

window.executePush = async function executePush() {
            const username = document.getElementById('github-user').value.trim();
            const repo = document.getElementById('github-repo').value.trim();
            const token = document.getElementById('github-token').value.trim();

            if (!username || !repo || !token) {
                await customAlert('Please fill out all fields.');
                return;
            }

            // Save for future
            localStorage.setItem('gh_username', username);
            localStorage.setItem('gh_token', token);

            document.getElementById('github-push-modal').style.display = 'none';
            document.getElementById('app-list').innerHTML = '<div style="text-align:center; color:#34d399; font-weight:bold;">Pushing to GitHub... This might take a few seconds.</div>';
            
            try {
                const res = await fetch('/api/apps/push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pid: activePushPid, token, repo, username })
                });
                const data = await res.json();
                if (data.success) {
                    await customAlert('Successfully pushed to GitHub!\n\nURL:\n' + data.url);
                    window.open(data.url, '_blank');
                } else {
                    await customAlert('Failed to push to GitHub:\n\n' + data.error);
                }
            } catch(e) {
                await customAlert('Network error pushing to GitHub');
            }
            window.showAppManager();
        };

