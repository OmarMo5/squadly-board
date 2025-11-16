-- Create trigger for task completion notifications
CREATE TRIGGER trigger_notify_task_completion
  AFTER INSERT ON public.task_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_completion();