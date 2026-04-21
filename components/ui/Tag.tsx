type Props = {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
};

export default function Tag({ children, active, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1 rounded-full border transition-colors duration-150 font-mono ${
        active
          ? "bg-black text-white border-black"
          : "bg-white text-[#666] border-[#eaeaea] hover:border-black hover:text-black"
      }`}
    >
      {children}
    </button>
  );
}
