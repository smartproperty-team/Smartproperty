import PropertyCard from "../components/PropertyCard";
import SectionHeader from "../components/SectionHeader";

const properties = [
  {
    title: "Central Park Residences",
    location: "New York, NY",
    price: "$7,500/mo",
    beds: 3,
    baths: 2,
    image:
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Oceanfront Villa",
    location: "Miami, FL",
    price: "$12,400/mo",
    beds: 4,
    baths: 4,
    image:
      "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Modern Loft",
    location: "Chicago, IL",
    price: "$3,900/mo",
    beds: 2,
    baths: 2,
    image:
      "https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Palm Heights",
    location: "Los Angeles, CA",
    price: "$9,100/mo",
    beds: 3,
    baths: 3,
    image:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Greenwood Estate",
    location: "Denver, CO",
    price: "$5,200/mo",
    beds: 4,
    baths: 3,
    image:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Harbor Point",
    location: "Boston, MA",
    price: "$6,750/mo",
    beds: 3,
    baths: 2,
    image:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
  },
];

export default function PropertiesPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <SectionHeader
          eyebrow="Marketplace"
          title="Find the right property"
          subtitle="Explore premium homes across top markets with verified data."
        />
        <div className="flex flex-wrap gap-3">
          <input
            className="rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white placeholder:text-slate-500"
            placeholder="Search by city, address, or ZIP"
          />
          <select className="rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white">
            <option>Type</option>
            <option>Apartment</option>
            <option>Condo</option>
            <option>Villa</option>
            <option>Studio</option>
          </select>
          <select className="rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white">
            <option>Price</option>
            <option>Under $5k</option>
            <option>$5k - $10k</option>
            <option>$10k+</option>
          </select>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => (
          <PropertyCard key={property.title} {...property} />
        ))}
      </div>
    </div>
  );
}
