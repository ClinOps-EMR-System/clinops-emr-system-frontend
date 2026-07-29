import type { SVGAttributes } from "react";

const Logo = (props: SVGAttributes<SVGElement>) => {
  return (
    <div className="flex flex-col leading-none">
      <span className="text-lg font-bold text-gray-900 dark:text-white">
        ClinOps
      </span>
    </div>
  );
};

export default Logo;
