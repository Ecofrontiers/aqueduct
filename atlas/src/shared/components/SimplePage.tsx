import clsx from "clsx";
import Header from "../../Header";
import Footer from "../../Footer";

export const SimplePage: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <>
      <Header />
      <div className="main-container min-h-screen flex flex-col justify-between">
        <div>
          <div
            className={clsx(
              "pt-[100px] md:pt-[140px] lg:pt-[80px]",
              "max-w-[780px] mx-auto"
            )}
          >
            {children}
          </div>
        </div>
        <div className="hidden lg:block">
          <Footer />
        </div>
      </div>
    </>
  );
};
