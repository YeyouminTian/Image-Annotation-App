export async function fetchRatingOptions() {
    const response = await fetch('/api/rating-options');
    if (!response.ok) {
        throw new Error('Failed to fetch rating options');
    }
    return response.json();
}

export async function fetchImages() {
    const response = await fetch('/api/images');
    if (!response.ok) {
        throw new Error('Failed to fetch images');
    }
    return response.json();
}

export async function submitRatings(ratings, filename) {
    const response = await fetch('/api/submit-ratings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ratings, filename }),
    });
    if (!response.ok) {
        throw new Error('Failed to submit ratings');
    }
    return response.json();
}