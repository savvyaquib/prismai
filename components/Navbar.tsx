import Link from "next/link";
import Image from "next/image";
import NavItems from "./NavItems";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";

const Navbar = () => {
  return (
    <nav className="navbar">
      <Link href="/">
        <div className="flex items-center gap-2.5 cursor-pointer">
          <Image src="/images/logo.png" width={100} height={100} alt="logo" className="w-auto h-16" />
        </div>
      </Link>
      <div className="flex items-center gap-8">
        <NavItems />
        <Show when="signed-out">
          <SignInButton>
            <button className="btn-signin">Sign In</button>
          </SignInButton>
          {/* <SignUpButton /> */}
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </nav>
  );
};

export default Navbar;
