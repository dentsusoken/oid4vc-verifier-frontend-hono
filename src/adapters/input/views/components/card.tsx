import { FC } from "hono/jsx";
import { JSX } from "hono/jsx/jsx-runtime";

export const Card: FC<{ children: JSX.Element; title: string }> = ({
  children,
  title,
}) => {
  return (
    <section class="bg-white rounded-lg shadow-md p-6 m-4 border border-gray-200">
      <div class="mb-4">
        <h2 class="text-xl font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </section>
  );
};