cask "second-brain-studio" do
  arch arm: "aarch64", intel: "x64"

  version "0.1.0"
  sha256 arm:   "PLACEHOLDER_ARM64_SHA256",
         intel: "PLACEHOLDER_INTEL_SHA256"

  url "https://github.com/Dopaemin/second-brain-studio/releases/download/v#{version}/Second.Brain_#{version}_#{arch}.dmg"
  name "Second Brain Studio"
  desc "Editorial desktop command center for developers, tech leads, and knowledge workers"
  homepage "https://github.com/Dopaemin/second-brain-studio"

  livecheck do
    url :url
    strategy :github_latest
  end

  auto_updates true
  depends_on macos: ">= :ventura"

  app "Second Brain.app"

  zap trash: [
    "~/Library/Application Support/com.emin.secondbrain",
    "~/Library/Preferences/com.emin.secondbrain.plist",
    "~/Library/Saved Application State/com.emin.secondbrain.savedState",
  ]
end
