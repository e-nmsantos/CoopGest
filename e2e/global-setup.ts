import { execSync } from "child_process";
import * as path from "path";

async function globalSetup() {
  const script = path.join(process.cwd(), "e2e_setup.py");
  execSync(`py "${script}"`, { stdio: "inherit" });
}

export default globalSetup;
