import React from "react";
import Image from "next/image";
import Link from "next/link";

type CategoryData = {
  id: number;
  title: string;
  img: string;
};

const SingleItem = React.memo(({ item }: { item: CategoryData }) => {
  return (
    <Link
      href="/shop"
      className="group block rounded-lg bg-gray-1 p-5 text-center ease-out duration-200 hover:bg-blue"
    >
      <div className="flex items-center justify-center w-full h-20 mb-4 ease-out duration-200 group-hover:scale-110">
        <Image src={item.img} alt={item.title} width={80} height={80} />
      </div>
      <p className="font-medium text-dark ease-out duration-200 group-hover:text-white">
        {item.title}
      </p>
    </Link>
  );
});

SingleItem.displayName = "CategorySingleItem";

export default SingleItem;
