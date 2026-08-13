type LogoVariant = "default" | "auth";

type LogoProps = {
  variant?: LogoVariant;
};

const Logo = ({ variant = "default" }: LogoProps) => {
  if (variant === "auth") {
    return (
      <div className="flex items-center gap-3">
        <div className="bg-white rounded-lg px-2 py-1">
          <img
            src="/logo/mustlogo.png"
            alt="Must Teaching Hospital"
            className="h-10 w-auto object-contain"
          />
        </div>
        <div className="h-8 w-px bg-white/20" />
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-lg px-2 py-1">
            <img
              src="/logo/AMS.png"
              alt="AMS"
              className="h-7 w-auto object-contain"
            />
          </div>
          <div className="bg-white rounded-lg px-2 py-1">
            <img
              src="/logo/global.png"
              alt="Global"
              className="h-7 w-auto object-contain"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col leading-none">
      <span className="text-lg font-bold text-gray-900 dark:text-white">
        ClinOps
      </span>
    </div>
  );
};

export default Logo;
