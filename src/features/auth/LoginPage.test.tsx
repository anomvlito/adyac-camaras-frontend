import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LoginPage from "./LoginPage";

describe("login view characterization", () => {
  it("preserves the visible access form and primary action styling", () => {
    const html = renderToStaticMarkup(<LoginPage onLogin={() => {}} />);

    expect(html).toContain("CentralParking");
    expect(html).toContain("Ingresá con tu cuenta");
    expect(html).toContain("Usuario");
    expect(html).toContain("Contraseña");
    expect(html).toContain("Ingresar");
    expect(html).toContain("bg-violet-600 hover:bg-violet-700");
    expect(html).toContain('autoComplete="username"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain('for="username"');
    expect(html).toContain('for="password"');
  });
});
