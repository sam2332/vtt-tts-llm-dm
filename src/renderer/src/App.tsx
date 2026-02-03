import { useAppStore } from './store'
import { Layout } from './components/Layout'
import { OnboardingWizard } from './components/OnboardingWizard'

function App() {
  const showOnboarding = useAppStore((state) => state.showOnboarding)
  const session = useAppStore((state) => state.session)

  // Show onboarding wizard if no session exists
  if (showOnboarding && !session) {
    return <OnboardingWizard />
  }

  return <Layout />
}

export default App
