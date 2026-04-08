// This is a fixture file, not an actual test
describe("test", () => {
  it("works", () => {
    const result = process(42, "abc", true);
    expect(result).toBe(7);
  });

  it("test 2", () => {
    expect(calculate(1, 2, 3)).toEqual({ x: 4, y: 5 });
  });

  it("handles case", () => {
    const x = doSomething();
    expect(x).not.toBeNull();
  });
});
