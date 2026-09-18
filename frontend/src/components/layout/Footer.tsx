import { Mail, Github, Twitter, Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <div className="py-4 border-t flex flex-col md:flex-row items-center justify-between px-6 bg-gray-50 text-[11px] text-gray-500 shrink-0">
      <div className="mb-2 md:mb-0 text-center md:text-left">
        <p>© 2026 VeriFund AI. Regulatory Disclosure: Financial analysis provided by AI models for institutional use only.</p>
        <p className="mt-1 flex items-center justify-center md:justify-start">
          <Mail className="h-3 w-3 mr-1" />
          Reach out to us: <a href="mailto:dummy@verifund.ai" className="ml-1 hover:underline font-medium">dummy@verifund.ai</a>
        </p>
      </div>
      <div className="flex space-x-4 items-center">
        <div className="flex space-x-3 text-gray-400">
          <a href="#" className="hover:text-gray-700" title="GitHub"><Github className="h-4 w-4" /></a>
          <a href="#" className="hover:text-gray-700" title="Twitter"><Twitter className="h-4 w-4" /></a>
          <a href="#" className="hover:text-gray-700" title="LinkedIn"><Linkedin className="h-4 w-4" /></a>
        </div>
        <span className="border-l h-4 mx-2 border-gray-300"></span>
        <a href="#" className="hover:underline">Terms of Service</a>
        <a href="#" className="hover:underline">Privacy Policy</a>
      </div>
    </div>
  );
};

export default Footer;
