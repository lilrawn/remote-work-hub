import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, User, CreditCard, Phone, Building, CheckCircle2 } from 'lucide-react';

const registrationSchema = z.object({
  full_name: z.string().min(2, 'Name is required').max(100),
  id_number: z.string().min(7, 'ID number must be at least 7 digits').max(10),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  phone_number: z.string().regex(/^(?:\+?254|0)?[17]\d{8}$/, 'Invalid phone number'),
  address: z.string().min(5, 'Address is required').max(200),
  county: z.string().min(2, 'County is required').max(50),
  payment_method: z.enum(['mpesa', 'bank']),
  // M-Pesa fields
  mpesa_phone: z.string().optional(),
  mpesa_name: z.string().optional(),
  // Bank fields
  bank_name: z.string().optional(),
  account_number: z.string().optional(),
  account_name: z.string().optional(),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const CompleteRegistration = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      phone_number: profile?.phone_number || '',
      payment_method: 'mpesa',
    },
  });

  const paymentMethod = form.watch('payment_method');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (data: RegistrationFormData) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone_number: data.phone_number,
          id_number: data.id_number,
          date_of_birth: data.date_of_birth,
          address: data.address,
          county: data.county,
          is_registration_complete: true,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Add payment method
      const paymentData = data.payment_method === 'mpesa'
        ? {
            user_id: user.id,
            method_type: 'mpesa',
            mpesa_phone: data.mpesa_phone,
            mpesa_name: data.mpesa_name,
            is_primary: true,
          }
        : {
            user_id: user.id,
            method_type: 'bank',
            bank_name: data.bank_name,
            account_number: data.account_number,
            account_name: data.account_name,
            is_primary: true,
          };

      const { error: paymentError } = await supabase
        .from('user_payment_methods')
        .insert(paymentData);

      if (paymentError) throw paymentError;

      // Update pending purchases to active
      const { error: purchaseError } = await supabase
        .from('user_purchases')
        .update({ status: 'active' })
        .eq('user_id', user.id)
        .eq('status', 'pending_registration');

      if (purchaseError) throw purchaseError;

      toast.success('Registration complete! You can now start earning.');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to complete registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Complete Your Registration</h1>
            <p className="text-muted-foreground">
              Fill in your details to start receiving payments
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= s
                      ? 'bg-gradient-hero text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
                </div>
                <span className={step >= s ? 'font-medium' : 'text-muted-foreground'}>
                  {s === 1 ? 'Personal Info' : 'Payment Details'}
                </span>
                {s < 2 && <div className="w-12 h-0.5 bg-muted" />}
              </div>
            ))}
          </div>

          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="rounded-xl bg-card border border-border p-6 shadow-soft">
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Personal Information
                  </h2>

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name (as per ID)</Label>
                      <Input id="full_name" {...form.register('full_name')} />
                      {form.formState.errors.full_name && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.full_name.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="id_number">National ID Number</Label>
                        <Input id="id_number" {...form.register('id_number')} />
                        {form.formState.errors.id_number && (
                          <p className="text-xs text-destructive">
                            {form.formState.errors.id_number.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date_of_birth">Date of Birth</Label>
                        <Input
                          id="date_of_birth"
                          type="date"
                          {...form.register('date_of_birth')}
                        />
                        {form.formState.errors.date_of_birth && (
                          <p className="text-xs text-destructive">
                            {form.formState.errors.date_of_birth.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone_number">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone_number"
                          className="pl-10"
                          placeholder="0712345678"
                          {...form.register('phone_number')}
                        />
                      </div>
                      {form.formState.errors.phone_number && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.phone_number.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Physical Address</Label>
                      <Input
                        id="address"
                        placeholder="Street, Estate, Town"
                        {...form.register('address')}
                      />
                      {form.formState.errors.address && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.address.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="county">County</Label>
                      <Input
                        id="county"
                        placeholder="e.g., Nairobi"
                        {...form.register('county')}
                      />
                      {form.formState.errors.county && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.county.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full bg-gradient-hero hover:opacity-90 text-primary-foreground"
                  >
                    Continue to Payment Details
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Payment Method
                  </h2>

                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(v) => form.setValue('payment_method', v as 'mpesa' | 'bank')}
                    className="grid grid-cols-2 gap-4"
                  >
                    <Label
                      htmlFor="mpesa"
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentMethod === 'mpesa'
                          ? 'border-success bg-success/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value="mpesa" id="mpesa" />
                      <div>
                        <p className="font-semibold text-success">M-Pesa</p>
                        <p className="text-xs text-muted-foreground">Instant payments</p>
                      </div>
                    </Label>
                    <Label
                      htmlFor="bank"
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentMethod === 'bank'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value="bank" id="bank" />
                      <div>
                        <p className="font-semibold">Bank Account</p>
                        <p className="text-xs text-muted-foreground">1-2 business days</p>
                      </div>
                    </Label>
                  </RadioGroup>

                  {paymentMethod === 'mpesa' && (
                    <div className="space-y-4 p-4 rounded-lg bg-success/5 border border-success/20">
                      <div className="space-y-2">
                        <Label htmlFor="mpesa_phone">M-Pesa Phone Number</Label>
                        <Input
                          id="mpesa_phone"
                          placeholder="0712345678"
                          {...form.register('mpesa_phone')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mpesa_name">M-Pesa Registered Name</Label>
                        <Input
                          id="mpesa_name"
                          placeholder="As registered with Safaricom"
                          {...form.register('mpesa_name')}
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'bank' && (
                    <div className="space-y-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="space-y-2">
                        <Label htmlFor="bank_name">Bank Name</Label>
                        <Input
                          id="bank_name"
                          placeholder="e.g., Equity Bank"
                          {...form.register('bank_name')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="account_number">Account Number</Label>
                        <Input
                          id="account_number"
                          placeholder="Your account number"
                          {...form.register('account_number')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="account_name">Account Name</Label>
                        <Input
                          id="account_name"
                          placeholder="Name as per bank records"
                          {...form.register('account_name')}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-hero hover:opacity-90 text-primary-foreground"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Completing...
                        </>
                      ) : (
                        'Complete Registration'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CompleteRegistration;
