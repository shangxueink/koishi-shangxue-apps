{
  description = "Description for the project";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    devshell.url = "github:numtide/devshell";
  };

  outputs = inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ inputs.devshell.flakeModule ];
      systems = [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" "x86_64-darwin" ];
      perSystem = { config, pkgs, system, ... }: {
        devshells.default = {
          env = [{ name = "NPM_TOKEN"; eval = "$(cat ~/.config/npm-token/NPM_TOKEN)"; }];
          packages = with pkgs; [ gnutar unzip curl yarn ];
        };
      };
    };
}
