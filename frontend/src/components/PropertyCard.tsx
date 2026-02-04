interface PropertyCardProps {
  title: string;
  location: string;
  price: string;
  beds: number;
  baths: number;
  image: string;
}

export default function PropertyCard({
  title,
  location,
  price,
  beds,
  baths,
  image,
}: PropertyCardProps) {
  return (
    <div className="gradient-outline group">
      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="relative h-48 overflow-hidden">
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute left-4 top-4 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-semibold text-white">
            Featured
          </span>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <p className="text-lg font-semibold text-white">{title}</p>
            <p className="text-sm text-slate-400">{location}</p>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>{beds} Beds</span>
            <span>{baths} Baths</span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-white">{price}</p>
            <button className="rounded-full border border-slate-700 px-3 py-1 text-xs text-white hover:border-blue-500">
              View details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
