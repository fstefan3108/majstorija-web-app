import { useState } from 'react';
import { Star, Send, Loader2 } from 'lucide-react';
import api from '../services/api';

const StarRating = ({ rating, onRatingChange, size = 'lg' }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const stars = [];
  const displayRating = hoverRating || rating;
  const cls = size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';

  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        className={`${cls} ${i <= displayRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} cursor-pointer hover:scale-110 transition-all`}
        onMouseEnter={() => setHoverRating(i)}
        onMouseLeave={() => setHoverRating(0)}
        onClick={() => onRatingChange(i)}
      />
    );
  }
  return <div className="flex gap-1">{stars}</div>;
};

const ReviewForm = ({ jobOrderId, onReviewSubmitted, onCancel }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Molimo vas da ocenite posao.');
      return;
    }

    if (comment.trim().length < 10) {
      setError('Komentar mora imati najmanje 10 karaktera.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('Niste prijavljeni.');
        return;
      }

      await api.submitJobReview(jobOrderId, rating, comment, parseInt(userId));
      onReviewSubmitted();
    } catch (err) {
      setError(err.message || 'Došlo je do greške prilikom slanja recenzije.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
        Ocenite posao
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating */}
        <div className="text-center">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vaša ocena
          </label>
          <StarRating rating={rating} onRatingChange={setRating} />
          <p className="text-sm text-gray-500 mt-1">
            {rating === 0 ? 'Kliknite na zvezdice da ocenite' : `Ocena: ${rating} zvezdica`}
          </p>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Komentar
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Opišite vaše iskustvo sa ovim poslom..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            {comment.length}/500 karaktera
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            Preskoči
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={loading || rating === 0}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Šalje se...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Pošalji recenziju
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;