import noImage from "@/assets/no-image.jpg";

type BookCoverProps = {
  imageUrl: string;
  alt: string;
  className?: string;
};

export const BookCover = ({
  imageUrl,
  alt,
  className = "",
}: BookCoverProps) => (
  <div
    className={`w-16 h-20 rounded-lg shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-200 border border-gray-200 overflow-hidden ${className}`}
  >
    <img
      src={imageUrl}
      alt={alt}
      className="w-full h-full object-cover"
      onError={(e) => {
        // Fallback to placeholder if image fails to load
        (e.target as HTMLImageElement).src = noImage;
      }}
    />
  </div>
);
