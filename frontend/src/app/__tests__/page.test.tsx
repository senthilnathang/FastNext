import { render, screen, waitFor } from "@testing-library/react";
import Home from "../page";

describe("Home", () => {
  it("renders the main page", async () => {
    render(<Home />);

    // Wait for the lazy-loaded HeroSection to render
    await waitFor(() => {
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
    });
  });
});
