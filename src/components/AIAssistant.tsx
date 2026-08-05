import React, { useState } from 'react';
import { Sparkles, Send, X, Bot, User, RefreshCw } from 'lucide-react';
import { ChatMessage, Party, Invoice, Payment, Product } from '../types';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  parties: Party[];
  invoices: Invoice[];
  payments?: Payment[];
  products?: Product[];
  onOpenNewInvoice: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  isOpen,
  onClose,
  parties,
  invoices,
  payments = [],
  products = [],
  onOpenNewInvoice
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: 'Namaste! I am Shiv AI, your Business Management Assistant. How can I assist you with tax invoices, GST calculations, customer ledgers, or payment reminders today?',
      timestamp: 'Just now'
    }
  ]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputQuery;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    // Simulate AI response logic with context awareness
    setTimeout(() => {
      let responseText = '';
      const queryLower = text.toLowerCase();

      if (queryLower.includes('product') || queryLower.includes('catalog')) {
        responseText = `📦 **Product Catalog Overview:**\nCurrently you have **${products.length} products** registered in your catalog.\n\nKey Products:\n• Cotton 60s Compact Satin (₹165/m • HSN 5208 • 5% GST)\n• Viscose Georgette 60g (₹95/m • HSN 5407 • 5% GST)\n• Heavy Silk Jacquard Brocade (₹540/m • HSN 5007 • 12% GST)`;
      } else if (queryLower.includes('gst') || queryLower.includes('tax') || queryLower.includes('calculate')) {
        responseText = `🧮 **GST Tax Calculation Breakdown:**\n• Base Amount (100 units × ₹165): **₹16,500**\n• GST Rate: **5%** (HSN 5208)\n• CGST (2.5%): ₹412.50\n• SGST (2.5%): ₹412.50\n• **Grand Total:** **₹17,325**`;
      } else if (queryLower.includes('reminder') || queryLower.includes('lakshmi') || queryLower.includes('payment')) {
        responseText = `📝 **Draft Payment Reminder (Lakshmi Fabrics):**\n\n"Dear Lakshmi Fabrics team,\nGreeting from Jai Shiv Business Management.\nThis is a gentle reminder regarding Tax Invoice #JS/24-25/0842 for ₹1,76,400.\nKindly initiate the RTGS to our HDFC Bank Account (A/C #50200012345678, IFSC: HDFC0000123).\n\nThank you for your business!"`;
      } else if (queryLower.includes('outstanding') || queryLower.includes('due') || queryLower.includes('customer')) {
        const totalUnpaid = invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + (i.grandTotal - i.paidAmount), 0);
        responseText = `📊 **Customer Dues Summary:**\nTotal Unpaid Receivables: **₹${totalUnpaid.toLocaleString('en-IN')}** across **${invoices.filter(i => i.status !== 'Paid').length} invoices**.\n\nCustomers with outstanding balances:\n• Lakshmi Fabrics & Sarees (₹4,25,000)\n• Rajdhani Fashion House (₹8,90,000)`;
      } else {
        responseText = `I have analyzed your query against your live BMS database. You currently have ${invoices.length} tax invoices generated and ${parties.length} customer accounts. Let me know if you would like me to draft an invoice or check payment balances!`;
      }

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: responseText,
        timestamp: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-[#141414] border-l border-white/10 shadow-2xl z-50 flex flex-col text-[#d1d1d1]">
      {/* Drawer Header */}
      <div className="p-4 bg-[#1a1a1a] border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
            <Sparkles className="w-4 h-4 fill-white" />
          </div>
          <div>
            <h3 className="font-serif italic text-base text-white leading-tight">Shiv AI Assistant</h3>
            <p className="text-[10px] text-blue-500 font-semibold tracking-wider uppercase">Business Intelligence Engine</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-[#d1d1d1]/50 hover:text-white rounded-full hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Prompt Chips */}
      <div className="p-3 bg-[#0a0a0a] border-b border-white/10 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        {[
          'Outstanding dues summary?',
          'Calculate GST 5%',
          'Payment reminder draft',
          'Product catalog summary'
        ].map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(chip)}
            className="bg-[#1a1a1a] hover:bg-blue-500/20 text-[#d1d1d1] hover:text-blue-500 px-3 py-1 rounded-full whitespace-nowrap border border-white/10 transition flex-shrink-0"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs bg-[#0a0a0a]/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-500 flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`p-3.5 rounded-2xl max-w-[85%] whitespace-pre-line leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white font-semibold rounded-tr-none'
                  : 'bg-[#1a1a1a] text-[#d1d1d1] border border-white/10 rounded-tl-none shadow-md'
              }`}
            >
              {msg.text}
              <span
                className={`block text-[9px] mt-1.5 font-normal ${
                  msg.sender === 'user' ? 'text-white/70 text-right' : 'text-[#d1d1d1]/40'
                }`}
              >
                {msg.timestamp}
              </span>
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2.5 items-center text-xs text-[#d1d1d1]/50 italic">
            <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            </div>
            <span>Shiv AI is processing...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-[#1a1a1a] border-t border-white/10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask Shiv AI anything..."
            className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-full px-4 py-2 text-xs text-white placeholder-[#d1d1d1]/30 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim()}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-full transition shadow-md shadow-blue-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
